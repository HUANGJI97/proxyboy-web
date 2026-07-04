const express = require('express');
const http = require('http');
const https = require('https');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { generateKeyPair, Certificate } = require('node-forge');
const { exec, execSync, spawn } = require('child_process');

const CONFIG = {
  webPort: 8080,
  proxyPort: 8888,
  publicDir: path.join(__dirname, 'public'),
  certsDir: path.join(__dirname, 'certs'),
  logsDir: path.join(__dirname, 'logs'),
  caKeyPath: path.join(__dirname, 'certs', 'ca.key'),
  caCertPath: path.join(__dirname, 'certs', 'ca.crt'),
  debug: false,
};

// 确保目录存在
[CONFIG.publicDir, CONFIG.certsDir, CONFIG.logsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 初始化 CA 证书
function initCA() {
  if (fs.existsSync(CONFIG.caKeyPath) && fs.existsSync(CONFIG.caCertPath)) {
    return {
      privateKey: fs.readFileSync(CONFIG.caKeyPath, 'utf8'),
      certificate: fs.readFileSync(CONFIG.caCertPath, 'utf8')
    };
  }
  
  console.log('生成新的 CA 证书...');
  const keys = generateKeyPair({ bits: 2048 });
  const cert = new Certificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);
  
  const attrs = [
    { name: 'commonName', value: 'ProxySniffer CA' },
    { name: 'countryName', value: 'CN' },
    { name: 'organizationName', value: 'ProxySniffer' }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: 'basicConstraints', cA: true },
    { name: 'keyUsage', keyCertSign: true, digitalSignature: true, keyEncipherment: true }
  ]);
  
  cert.sign(keys.privateKey, 'SHA256');
  
  const privateKeyPem = generateKeyPair.exportKey(keys.privateKey, 'pem');
  const certPem = Certificate.exportCertificate(cert, 'pem');
  
  fs.writeFileSync(CONFIG.caKeyPath, privateKeyPem);
  fs.writeFileSync(CONFIG.caCertPath, certPem);
  
  console.log('CA 证书生成完成');
  return { privateKey: privateKeyPem, certificate: certPem };
}

initCA();

// 保存抓包日志
function saveCaptureLog(data) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(CONFIG.logsDir, `capture-${today}.json`);
    
    let logs = [];
    if (fs.existsSync(logFile)) {
      logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    
    logs.push(data);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  } catch (e) {
    if (CONFIG.debug) console.error('保存日志失败:', e);
  }
}

// 读取抓包日志（限制数量）
function getCaptureLogs(limit = 100) {
  try {
    const files = fs.readdirSync(CONFIG.logsDir)
      .filter(f => f.startsWith('capture-') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    let allLogs = [];
    for (const file of files) {
      if (allLogs.length >= limit) break;
      
      const filepath = path.join(CONFIG.logsDir, file);
      try {
        const content = fs.readFileSync(filepath, 'utf8');
        const logs = JSON.parse(content);
        const cleanLogs = logs.map(log => {
          const clean = { ...log };
          if (clean.responseBody && typeof clean.responseBody === 'string') {
            clean.responseBody = clean.responseBody.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
          }
          return clean;
        });
        allLogs = allLogs.concat(cleanLogs);
      } catch (e) {
        if (CONFIG.debug) console.error(`读取日志文件失败: ${file}`, e);
      }
    }
    
    return allLogs.slice(0, limit);
  } catch (e) {
    if (CONFIG.debug) console.error('读取日志目录失败:', e);
    return [];
  }
}

// ===== Express Web 服务 =====
const webApp = express();

// 静态文件服务
webApp.use(express.static(CONFIG.publicDir));

// API: 获取日志
webApp.get('/admin/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const logs = getCaptureLogs(limit);
  res.json({ logs, total: logs.length, loaded: logs.length, limit });
});

// API: 清空日志
webApp.post('/admin/api/logs/clear', (req, res) => {
  try {
    const files = fs.readdirSync(CONFIG.logsDir)
      .filter(f => f.startsWith('capture-') && f.endsWith('.json'));
    for (const file of files) {
      fs.unlinkSync(path.join(CONFIG.logsDir, file));
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

// API: 获取服务状态
webApp.get('/admin/api/service/status', (req, res) => {
  try {
    let webRunning = false;
    try {
      execSync('netstat -tlnp 2>/dev/null | grep :8080 || ss -tlnp 2>/dev/null | grep :8080', { stdio: 'pipe' });
      webRunning = true;
    } catch (e) {}
    
    let proxyRunning = false;
    try {
      execSync('netstat -tlnp 2>/dev/null | grep :8888 || ss -tlnp 2>/dev/null | grep :8888', { stdio: 'pipe' });
      proxyRunning = true;
    } catch (e) {}
    
    res.json({
      web: { running: webRunning, port: 8080 },
      proxy: { running: proxyRunning, port: 8888 }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// API: 启动代理服务
webApp.post('/admin/api/service/proxy/start', (req, res) => {
  try {
    const proc = spawn('node', ['proxy-only.js'], {
      cwd: __dirname,
      detached: true,
      stdio: 'ignore'
    });
    proc.unref();
    
    res.json({ success: true, message: '代理服务启动中...' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// API: 停止代理服务
webApp.post('/admin/api/service/proxy/stop', (req, res) => {
  try {
    exec('pkill -f "proxy-only"', (error, stdout, stderr) => {
      res.json({ success: true, message: '代理服务已停止' });
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 路由：/admin -> admin.html
webApp.get('/admin', (req, res) => {
  res.sendFile(path.join(CONFIG.publicDir, 'admin.html'));
});

// 路由：/manager -> service-manager.html
webApp.get('/manager', (req, res) => {
  res.sendFile(path.join(CONFIG.publicDir, 'service-manager.html'));
});

// 路由：/cert -> 证书下载页面
webApp.get('/cert', (req, res) => {
  res.sendFile(path.join(CONFIG.certsDir, 'index.html'));
});

webApp.get('/cert/ca.crt', (req, res) => {
  res.sendFile(CONFIG.caCertPath);
});

// 启动 Web 服务
const webServer = http.createServer(webApp);
webServer.listen(CONFIG.webPort, '0.0.0.0', () => {
  console.log(`Web 管理服务启动成功！`);
  console.log(`监听端口: ${CONFIG.webPort}`);
  console.log(`\n访问地址:`);
  console.log(`  Web 管理: http://115.159.196.184:${CONFIG.webPort}/admin`);
  console.log(`  服务管理: http://115.159.196.184:${CONFIG.webPort}/manager`);
  console.log(`  证书下载: http://115.159.196.184:${CONFIG.webPort}/cert`);
  console.log(`\n按 Ctrl+C 停止服务`);
});

// ===== 代理服务（端口 8888）=====
const proxyServer = http.createServer((req, res) => {
  let fullUrl = req.url;
  if (!fullUrl.startsWith('http')) {
    const host = req.headers.host || 'localhost';
    fullUrl = `http://${host}${req.url}`;
  }
  const parsedUrl = new URL(fullUrl);
  
  if (CONFIG.debug) console.log(`HTTP: ${req.method} ${fullUrl}`);
  
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 80,
    path: parsedUrl.pathname + parsedUrl.search,
    method: req.method,
    headers: req.headers,
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
    
    let responseBody = '';
    proxyRes.on('data', chunk => responseBody += chunk);
    proxyRes.on('end', () => {
      saveCaptureLog({
        type: 'http',
        method: req.method,
        url: fullUrl,
        requestHeaders: req.headers,
        responseStatus: proxyRes.statusCode,
        responseHeaders: proxyRes.headers,
        responseBody: responseBody.substring(0, 10000),
        timestamp: new Date().toISOString(),
      });
    });
  });
  
  req.pipe(proxyReq);
  
  proxyReq.on('error', (e) => {
    if (CONFIG.debug) console.error('代理请求失败:', e);
    res.writeHead(500);
    res.end('Proxy Error');
  });
});

// HTTPS MITM 拦截
proxyServer.on('connect', (req, clientSocket, head) => {
  const [host, port] = req.url.split(':');
  
  if (CONFIG.debug) console.log(`HTTPS CONNECT: ${host}:${port}`);
  
  const serverSocket = net.connect(port || 443, host, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });
  
  serverSocket.on('error', (e) => {
    if (CONFIG.debug) console.error('HTTPS 连接失败:', e);
    clientSocket.end();
  });
});

// 启动代理服务
proxyServer.listen(CONFIG.proxyPort, '0.0.0.0', () => {
  console.log(`代理服务启动成功！`);
  console.log(`监听端口: ${CONFIG.proxyPort}`);
  console.log(`\n客户端配置:`);
  console.log(`1. 设置代理: 115.159.196.184:${CONFIG.proxyPort}`);
  console.log(`2. 安装 CA 证书: ${CONFIG.caCertPath}`);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在停止服务...');
  webServer.close(() => {
    proxyServer.close(() => {
      console.log('服务已停止');
      process.exit(0);
    });
  });
});
