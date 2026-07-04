#!/usr/bin/env node

/**
 * ProxySniffer - 纯代理服务（端口 8888）
 * 只处理代理请求，不处理 Web 管理
 */

const http = require('http');
const https = require('https');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { generateKeyPair, Certificate } = require('node-forge');

const CONFIG = {
  proxyPort: 8888,
  logsDir: path.join(__dirname, 'logs'),
  caKeyPath: path.join(__dirname, 'certs', 'ca.key'),
  caCertPath: path.join(__dirname, 'certs', 'ca.crt'),
  debug: false,
};

// 确保目录存在
if (!fs.existsSync(CONFIG.logsDir)) {
  fs.mkdirSync(CONFIG.logsDir, { recursive: true });
}

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

// 创建代理服务器
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
  console.log(`\n按 Ctrl+C 停止服务`);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在停止代理服务...');
  proxyServer.close(() => {
    console.log('代理服务已停止');
    process.exit(0);
  });
});
