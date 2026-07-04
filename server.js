#!/usr/bin/env node

/**
 * HTTP/HTTPS Proxy Server with Packet Capture
 * Simplified & Stable Version
 */

const http = require('http');
const https = require('https');
const net = require('net');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const forge = require('node-forge');
const { program } = require('commander');

const CONFIG = {
  proxyPort: 8080,
  logDir: path.join(__dirname, 'logs'),
  certsDir: path.join(__dirname, 'certs'),
  caKeyPath: path.join(__dirname, 'certs', 'ca.key'),
  caCertPath: path.join(__dirname, 'certs', 'ca.crt'),
};

function log(msg) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`);
}

function ensureCertsDir() {
  if (!fs.existsSync(CONFIG.certsDir)) {
    fs.mkdirSync(CONFIG.certsDir, { recursive: true });
  }
}

function generateCA() {
  ensureCertsDir();
  
  const keys = forge.pki.rsa.generateKeyPair({ bits: 2048 });
  const cert = forge.pki.createCertificate();
  
  cert.publicKey = keys.publicKey;
  cert.serialNumber = crypto.randomBytes(16).toString('hex');
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000);
  
  const attrs = [
    { name: 'commonName', value: 'ProxySniffer CA' },
    { name: 'countryName', value: 'CN' },
    { name: 'organizationName', value: 'ProxySniffer Root CA' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: 'basicConstraints', cA: true },
    { name: 'keyUsage', keyCertSign: true, digitalSignature: true, keyEncipherment: true },
  ]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  
  fs.writeFileSync(CONFIG.caKeyPath, forge.pki.privateKeyToPem(keys.privateKey));
  fs.writeFileSync(CONFIG.caCertPath, forge.pki.certificateToPem(cert));
  
  log('CA certificate generated successfully');
}

function generateServerCert(hostname) {
  const caKey = forge.pki.privateKeyFromPem(fs.readFileSync(CONFIG.caKeyPath, 'utf8'));
  const caCert = forge.pki.certificateFromPem(fs.readFileSync(CONFIG.caCertPath, 'utf8'));
  
  const keys = forge.pki.rsa.generateKeyPair({ bits: 2048 });
  const cert = forge.pki.createCertificate();
  
  cert.publicKey = keys.publicKey;
  cert.serialNumber = crypto.randomBytes(16).toString('hex');
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 3600 * 1000);
  
  cert.setSubject([{ name: 'commonName', value: hostname }]);
  cert.setIssuer(caCert.subject.attributes);
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', serverAuth: true },
    { name: 'subjectAltName', altNames: [{ type: 2, value: hostname }] },
  ]);
  cert.sign(caKey, forge.md.sha256.create());
  
  return {
    cert: forge.pki.certificateToPem(cert),
    key: forge.pki.privateKeyToPem(keys.privateKey),
  };
}

function saveCapture(data) {
  if (!fs.existsSync(CONFIG.logDir)) {
    fs.mkdirSync(CONFIG.logDir, { recursive: true });
  }
  const filename = `capture-${new Date().toISOString().split('T')[0]}.json`;
  const filepath = path.join(CONFIG.logDir, filename);
  
  let logs = [];
  if (fs.existsSync(filepath)) {
    try { logs = JSON.parse(fs.readFileSync(filepath, 'utf8')); } catch (e) {}
  }
  logs.push({ ...data, timestamp: new Date().toISOString() });
  fs.writeFileSync(filepath, JSON.stringify(logs, null, 2));
}

function startProxy(port) {
  ensureCertsDir();
  if (!fs.existsSync(CONFIG.caKeyPath)) {
    generateCA();
  }
  
  const server = http.createServer();
  
  // HTTP 请求处理
  server.on('request', (req, res) => {
    // 获取客户端 IP（多种方式尝试）
    let clientIp = 'unknown';
    try {
      clientIp = 
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        req.connection?.remoteAddress ||
        req.ip ||
        'unknown';
      
      // 处理 IPv6 映射的 IPv4 地址
      if (clientIp === 'unknown') {
        clientIp = 'unknown';
      }
    } catch (e) {
      log(`Error getting client IP: ${e.message}`);
    }
    
    // 修复：req.url 可能只是路径，需要构造完整 URL
    let fullUrl = req.url;
    if (!fullUrl.startsWith('http')) {
      // 从请求头获取 host
      const host = req.headers.host || 'localhost';
      fullUrl = `http://${host}${req.url}`;
    }
    const url = new URL(fullUrl);
    log(`HTTP: ${req.method} ${fullUrl}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: req.method,
      headers: req.headers,
    };
    
    const proxy = http.request(options, (proxyRes) => {
      // 记录抓包
      let body = '';
      proxyRes.on('data', (chunk) => { body += chunk.toString('utf8'); });
      proxyRes.on('end', () => {
        const captureData = {
            requestStartTime: Date.now(),
        };
        
        const endTime = Date.now();
        captureData.responseTime = endTime - captureData.requestStartTime;
        captureData.requestBodySize = Buffer.byteLength(req.body || '');
        captureData.responseBodySize = Buffer.byteLength(body);
        
        saveCapture({
          type: 'http',
          method: req.method,
          url: req.url,
          clientIp: clientIp,
          clientInfo: {
            ip: clientIp,
            userAgent: req.headers['user-agent'],
            referer: req.headers['referer'],
            origin: req.headers['origin'],
            acceptLanguage: req.headers['accept-language'],
            acceptEncoding: req.headers['accept-encoding'],
            xForwardedFor: req.headers['x-forwarded-for'],
            xRealIp: req.headers['x-real-ip'],
            connection: req.headers['connection'],
            contentType: req.headers['content-type'],
            auth: req.headers['authorization'] ? '***' : undefined,  // 不记录敏感信息
          },
          requestHeaders: req.headers,
          responseStatus: proxyRes.statusCode,
          responseHeaders: proxyRes.headers,
          responseBody: body.substring(0, 10000),
        });
      });
      
      // 转发响应
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    proxy.on('error', (err) => {
      log(`Proxy error: ${err.message}`);
      res.writeHead(502);
      res.end('Proxy Error');
    });
    
    req.pipe(proxy);
  });
  
  // HTTPS CONNECT 隧道
  server.on('connect', (req, clientSocket, head) => {
    const [hostname, port] = req.url.split(':');
    const targetPort = parseInt(port) || 443;
    
    // 获取客户端 IP（多种方式尝试）
    let clientIp = 'unknown';
    try {
      clientIp = 
        clientSocket?.remoteAddress ||
        clientSocket?.socket?.remoteAddress ||
        req?.socket?.remoteAddress ||
        req?.connection?.remoteAddress ||
        'unknown';
    } catch (e) {
      log(`Error getting client IP: ${e.message}`);
    }
    
    log(`HTTPS CONNECT: ${hostname}:${targetPort} from ${clientIp}`);
    
    // 连接到真实服务器
    const serverSocket = net.connect(targetPort, hostname, () => {
      // 发送 200 连接确认
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      
      // 生成动态证书
      const { cert, key } = generateServerCert(hostname);
      
      // 创建 TLS 服务器（中间人）
      const tls = require('tls');
      const fakeServer = tls.createServer({ cert, key }, (tlsSocket) => {
        // 连接到真实服务器（TLS）
        const targetTls = tls.connect({
          host: hostname,
          port: targetPort,
          servername: hostname,
        }, () => {
          log(`TLS tunnel established: ${hostname}`);
        });
        
        // 双向转发
        tlsSocket.pipe(targetTls);
        targetTls.pipe(tlsSocket);
        
        // 捕获数据
        const capture = { 
          type: 'https', 
          url: `https://${hostname}`, 
          clientIp: clientIp,
          clientInfo: {
            ip: clientIp,
            userAgent: req.headers['user-agent'],
            referer: req.headers['referer'],
            origin: req.headers['origin'],
            acceptLanguage: req.headers['accept-language'],
            xForwardedFor: req.headers['x-forwarded-for'],
            xRealIp: req.headers['x-real-ip'],
          },
          timestamp: new Date().toISOString() 
        };
        tlsSocket.on('data', (data) => { capture.clientData = data.toString('utf8').substring(0, 5000); });
        targetTls.on('data', (data) => { 
          capture.serverData = data.toString('utf8').substring(0, 5000);
          saveCapture(capture);
        });
      });
      
      // 将客户端 socket 升级为 TLS
      fakeServer.emit('connection', clientSocket);
    });
    
    serverSocket.on('error', (err) => {
      log(`Target connection error: ${err.message}`);
      clientSocket.end();
    });
  });
  
  server.listen(port, '0.0.0.0', () => {
    log(`Proxy server listening on port ${port}`);
    log(`CA certificate: ${CONFIG.caCertPath}`);
    log(`Logs: ${CONFIG.logDir}`);
    log(`\nClient setup:`);
    log(`1. Install CA cert: ${CONFIG.caCertPath}`);
    log(`2. Set proxy: ${getLocalIP()}:${port}`);
  });
}

function getLocalIP() {
  const interfaces = require('os').networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

program.command('start').option('-p, --port <port>').action((opts) => {
  startProxy(parseInt(opts.port) || CONFIG.proxyPort);
});

program.command('gen-ca').action(() => {
  ensureCertsDir();
  generateCA();
});

program.parse();
