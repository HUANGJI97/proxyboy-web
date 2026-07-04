#!/usr/bin/env node

/**
 * ProxySniffer - 单端口耦合版本
 * 一个服务同时提供：代理 + Web管理 + 证书下载
 * 
 * 访问地址：
 * - http://115.159.196.184:8080/      -> 代理服务
 * - http://115.159.196.184:8080/admin -> Web 管理界面
 * - http://115.159.196.184:8080/cert  -> 证书下载页面
 */

const http = require('http');
const https = require('https');
const net = require('net');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { generateKeyPair, Certificate } = require('node-forge');

const CONFIG = {
  port: 8080,
  publicDir: path.join(__dirname, 'public'),
  certsDir: path.join(__dirname, 'certs'),
  logsDir: path.join(__dirname, 'logs'),
  caKeyPath: path.join(__dirname, 'certs', 'ca.key'),
  caCertPath: path.join(__dirname, 'certs', 'ca.crt'),
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

const ca = initCA();

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
    console.error('保存日志失败:', e);
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
        console.error(`读取日志文件失败: ${file}`, e);
      }
    }
    
    return allLogs.slice(0, limit);
  } catch (e) {
    console.error('读取日志目录失败:', e);
    return [];
  }
}

// 静态文件服务
function serveStaticFile(res, filepath) {
  const ext = path.extname(filepath);
  const contentTypeMap = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
  };
  
  const contentType = contentTypeMap[ext] || 'application/octet-stream';
  
  try {
    const content = fs.readFileSync(filepath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
}

// 创建 HTTP 代理服务器
const proxyServer = http.createServer();

proxyServer.on('request', (req, res) => {
  // 修复：req.url 可能只是路径，需要构造完整 URL
  let fullUrl = req.url;
  if (!fullUrl.startsWith('http')) {
    const host = req.headers.host || 'localhost';
    fullUrl = `http://${host}${req.url}`;
  }
  const parsedUrl = new URL(fullUrl);
  
  console.log(`HTTP: ${req.method} ${fullUrl}`);
  
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
    
    // 保存日志
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
        responseBody: responseBody.substring(0, 10000), // 限制大小
        timestamp: new Date().toISOString(),
      });
    });
  });
  
  req.pipe(proxyReq);
  
  proxyReq.on('error', (e) => {
    console.error('代理请求失败:', e);
    res.writeHead(500);
    res.end('Proxy Error');
  });
});

// HTTPS MITM 拦截（简化版）
proxyServer.on('connect', (req, clientSocket, head) => {
  const [host, port] = req.url.split(':');
  
  console.log(`HTTPS CONNECT: ${host}:${port}`);
  
  const serverSocket = net.connect(port || 443, host, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });
  
  serverSocket.on('error', (e) => {
    console.error('HTTPS 连接失败:', e);
    clientSocket.end();
  });
});

// 创建主服务器（处理代理 + Web管理 + 证书下载）
const mainServer = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // ===== Web 管理界面 =====
  
  // API: 获取日志
  if (pathname === '/admin/api/logs' && req.method === 'GET') {
    const limit = parseInt(parsedUrl.searchParams.get('limit')) || 100;
    const logs = getCaptureLogs(limit);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ logs, total: logs.length, loaded: logs.length, limit }));
    return;
  }
  
  // API: 清空日志
  if (pathname === '/admin/api/logs/clear' && req.method === 'POST') {
    try {
      const files = fs.readdirSync(CONFIG.logsDir)
        .filter(f => f.startsWith('capture-') && f.endsWith('.json'));
      for (const file of files) {
        fs.unlinkSync(path.join(CONFIG.logsDir, file));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false }));
    }
    return;
  }
  
  // Web 管理界面
  if (pathname === '/admin' || pathname === '/admin/' || pathname.startsWith('/admin/')) {
    const subPath = pathname.replace('/admin', '') || '/';
    
    if (subPath === '/' || subPath === '/index.html') {
      serveStaticFile(res, path.join(CONFIG.publicDir, 'proxyman-style.html'));
      return;
    }
    
    const filepath = path.join(CONFIG.publicDir, subPath);
    if (fs.existsSync(filepath) && fs.statSync(filepath).isFile()) {
      serveStaticFile(res, filepath);
      return;
    }
  }
  
  // ===== 证书下载页面 =====
  if (pathname === '/cert' || pathname === '/cert/') {
    serveStaticFile(res, path.join(CONFIG.certsDir, 'index.html'));
    return;
  }
  
  if (pathname === '/cert/ca.crt') {
    serveStaticFile(res, CONFIG.caCertPath);
    return;
  }
  
  // ===== 代理服务（默认）=====
  // 如果不是 /admin 或 /cert 开头的请求，都转发到代理
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/cert')) {
    // 转发到代理服务
    const options = {
      hostname: 'localhost',
      port: CONFIG.port,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };
    
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    req.pipe(proxyReq);
    
    proxyReq.on('error', (e) => {
      res.writeHead(503);
      res.end('代理服务未启动，请检查服务状态');
    });
    
    return;
  }
  
  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

// 启动服务
proxyServer.listen(CONFIG.port, '0.0.0.0', () => {
  console.log(`代理服务监听端口 ${CONFIG.port}`);
  console.log(`CA 证书: ${CONFIG.caCertPath}`);
  console.log(`日志目录: ${CONFIG.logsDir}`);
  console.log(`\n客户端配置:`);
  console.log(`1. 安装 CA 证书: ${CONFIG.caCertPath}`);
  console.log(`2. 设置代理: 115.159.196.184:${CONFIG.port}`);
});

mainServer.listen(CONFIG.port + 1, '0.0.0.0', () => {
  console.log(`\n主服务监听端口 ${CONFIG.port + 1}`);
  console.log(`Web 管理: http://localhost:${CONFIG.port + 1}/admin`);
  console.log(`证书下载: http://localhost:${CONFIG.port + 1}/cert`);
  console.log(`\n按 Ctrl+C 停止服务`);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在停止服务...');
  proxyServer.close();
  mainServer.close(() => {
    console.log('服务已停止');
    process.exit(0);
  });
});
