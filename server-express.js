const express = require('express');
const http = require('http');
const https = require('https');
const net = require('net');
const fs = require('fs');
const path = require('path');
const forge = require('node-forge');
const { exec, execSync, spawn } = require('child_process');

const os = require('os');

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
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
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

  cert.sign(keys.privateKey, forge.md.sha256.create());

  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
  const certPem = forge.pki.certificateToPem(cert);

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

// 检测端口是否在监听
function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.connect(port, '127.0.0.1');
  });
}

// 获取本机局域网 IP
function getLanIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      // 跳过内部地址和非 IPv4
      if (addr.family === 'IPv4' && !addr.internal) {
        ips.push({ interface: name, address: addr.address });
      }
    }
  }
  return ips;
}

// API: 获取网络信息
webApp.get('/admin/api/service/network', (req, res) => {
  try {
    const hostname = os.hostname();
    const ips = getLanIPs();
    res.json({ hostname, ips });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// API: 获取服务状态
webApp.get('/admin/api/service/status', async (req, res) => {
  try {
    const [webRunning, proxyRunning] = await Promise.all([
      checkPort(8080),
      checkPort(8888)
    ]);

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
  console.log('[API] 收到启动代理服务请求');
  try {
    console.log("启动代理服务")
    const proc = spawn('node', ['proxy-only.js'], {
      cwd: __dirname,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';
    proc.stderr.on('data', (data) => {
      const msg = data.toString();
      stderr += msg;
      console.error(`[proxy-only stderr] ${msg.trim()}`);
    });

    proc.stdout.on('data', (data) => {
      console.log(`[proxy-only stdout] ${data.toString().trim()}`);
    });

    proc.on('error', (err) => {
      console.error(`[API] spawn 进程失败: ${err.message}`);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error(`[API] 代理进程异常退出，退出码: ${code}${stderr ? ', stderr: ' + stderr.trim() : ''}`);
      } else {
        console.log(`[API] 代理进程正常退出，退出码: 0`);
      }
    });

    proc.unref();

    const now = new Date().toISOString();
    console.log(`[API] 代理服务已启动 | PID: ${proc.pid} | 时间: ${now}`);
    res.json({ success: true, message: '代理服务启动中...', pid: proc.pid });
  } catch (e) {
    console.error(`[API] 启动代理服务失败: ${e.message}`);
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
  const ips = getLanIPs();
  const primaryIP = ips.length > 0 ? ips[0].address : 'localhost';

  console.log(`Web 管理服务启动成功！`);
  console.log(`监听端口: ${CONFIG.webPort}`);
  console.log(`主机名: ${os.hostname()}`);
  console.log(`网卡 IP:`);
  ips.forEach(({ interface: iface, address }) => {
    console.log(`  ${iface}: ${address}`);
  });
  console.log(`\n访问地址:`);
  console.log(`  Web 管理: http://${primaryIP}:${CONFIG.webPort}/admin`);
  console.log(`  服务管理: http://${primaryIP}:${CONFIG.webPort}/manager`);
  console.log(`  证书下载: http://${primaryIP}:${CONFIG.webPort}/cert`);
  console.log(`\n按 Ctrl+C 停止服务`);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在停止服务...');
  webServer.close(() => {
    console.log('Web 服务已停止');
    process.exit(0);
  });
});
