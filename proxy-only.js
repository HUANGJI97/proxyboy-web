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
const forge = require('node-forge');

const tls = require('tls');

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

// 加载 CA 证书为 forge 对象（用于签发域名证书）
const caForge = {
  key: forge.pki.privateKeyFromPem(fs.readFileSync(CONFIG.caKeyPath, 'utf8')),
  cert: forge.pki.certificateFromPem(fs.readFileSync(CONFIG.caCertPath, 'utf8')),
};

// 域名证书缓存（避免重复生成）
const hostCertCache = {};

function getHostCert(hostname) {
  if (hostCertCache[hostname]) return hostCertCache[hostname];

  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = Date.now().toString(16);
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  cert.setSubject([
    { name: 'commonName', value: hostname },
    { name: 'organizationName', value: 'ProxySniffer' },
  ]);
  cert.setIssuer(caForge.cert.subject.attributes);

  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', serverAuth: true },
    { name: 'subjectAltName', altNames: [{ type: 2, value: hostname }] },
  ]);

  cert.sign(caForge.key, forge.md.sha256.create());

  const result = {
    key: forge.pki.privateKeyToPem(keys.privateKey),
    cert: forge.pki.certificateToPem(cert),
  };
  hostCertCache[hostname] = result;
  return result;
}

// 格式化字节
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

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

// 获取客户端信息
function getClientInfo(req) {
  const ip = req.socket?.remoteAddress || req.connection?.remoteAddress || '?';
  const port = req.socket?.remotePort || req.connection?.remotePort || '?';
  const ua = (req.headers['user-agent'] || '').substring(0, 60);
  return { ip, port, ua };
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
  
  // 客户端连接断开时的错误处理
  req.on('error', (e) => {
    if (CONFIG.debug) console.error('HTTP 客户端请求错误:', e.message);
  });
  res.on('error', (e) => {
    if (CONFIG.debug) console.error('HTTP 客户端响应错误:', e.message);
  });
  
    const proxyReq = http.request(options, (proxyRes) => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    const client = getClientInfo(req);
    console.log(`[${time}] ${client.ip}:${client.port} | ${req.method} ${fullUrl} → ${proxyRes.statusCode}`);
    
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
    
    proxyRes.on('error', (e) => {
      if (CONFIG.debug) console.error('HTTP 代理响应流错误:', e.message);
      res.end();
    });
    
    let responseBody = '';
    proxyRes.on('data', chunk => responseBody += chunk);
    proxyRes.on('end', () => {
      saveCaptureLog({
        type: 'http',
        clientIP: client.ip,
        method: req.method,
        url: fullUrl,
        requestHeaders: req.headers,
        requestBody: requestBody.substring(0, 10000),
        responseStatus: proxyRes.statusCode,
        responseHeaders: proxyRes.headers,
        responseBody: responseBody.substring(0, 10000),
        timestamp: new Date().toISOString(),
      });
    });
  });
  
  // 收集请求体
  let requestBody = '';
  req.on('data', chunk => {
    if (requestBody.length < 10000) requestBody += chunk.toString();
  });
  req.pipe(proxyReq);
  
  proxyReq.on('error', (e) => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    console.log(`[${time}] ${req.method} ${fullUrl} → ERR ${e.message}`);
    if (!res.headersSent) {
      res.writeHead(502);
      res.end('Proxy Error');
    }
  });
});

// HTTPS MITM 解密拦截
proxyServer.on('connect', (req, clientSocket, head) => {
  const [host, port] = req.url.split(':');
  const targetPort = parseInt(port) || 443;
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const clientIP = clientSocket.remoteAddress || '?';
  console.log(`[${time}] ${clientIP} | MITM ${host}:${targetPort}`);

  clientSocket.on('error', (e) => {
    if (CONFIG.debug) console.error(`MITM ${host} 客户端错误:`, e.message);
  });

  // 为域名生成临时证书
  let hostCert;
  try {
    hostCert = getHostCert(host);
  } catch (e) {
    console.error(`[${time}] MITM ${host} 证书生成失败:`, e.message);
    clientSocket.end();
    return;
  }

  // 通知客户端隧道建立
  clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

  // 创建 TLS 拦截器
  const interceptor = new tls.TLSSocket(clientSocket, {
    isServer: true,
    key: hostCert.key,
    cert: hostCert.cert,
    requestCert: false,
  });

  interceptor.on('error', (e) => {
    console.error(`[${time}] MITM ${host} TLS 错误:`, e.message);
  });

  // 在解密后的 socket 上解析 HTTP 请求
  let buf = '';
  interceptor.on('data', (data) => {
    buf += data.toString();
    // 解析完整的 HTTP 请求
    const headerEnd = buf.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;

    const headerPart = buf.substring(0, headerEnd);
    const bodyHead = buf.substring(headerEnd + 4);
    buf = ''; // 清空缓冲区

    const lines = headerPart.split('\r\n');
    const firstLine = lines[0];
    const match = firstLine.match(/^(\w+)\s+(.+?)\s+HTTP\/(\d+\.\d+)$/);
    if (!match) return;

    const method = match[1];
    const path = match[2];
    const reqHeaders = {};
    for (let i = 1; i < lines.length; i++) {
      const col = lines[i].indexOf(':');
      if (col > 0) reqHeaders[lines[i].substring(0, col).trim().toLowerCase()] = lines[i].substring(col + 1).trim();
    }
    // 移除 hop-by-hop 头
    delete reqHeaders['proxy-connection'];
    delete reqHeaders['proxy-authorization'];

    const reqTime = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    const fullUrl = `https://${host}${path}`;

    // 发送请求到真实服务器
    const realReq = https.request({
      hostname: host,
      port: targetPort,
      path,
      method,
      headers: reqHeaders,
      rejectUnauthorized: false,
    }, (realRes) => {
      // 构建响应头
      let responseHeaders = `HTTP/1.1 ${realRes.statusCode} ${realRes.statusMessage}\r\n`;
      delete realRes.headers['transfer-encoding']; // 用 content-length 替代
      for (const [k, v] of Object.entries(realRes.headers)) {
        responseHeaders += `${k}: ${v}\r\n`;
      }

      let responseBody = '';
      const chunks = [];

      realRes.on('data', (chunk) => {
        chunks.push(chunk);
        responseBody += chunk.toString();
      });

      realRes.on('end', () => {
        const body = Buffer.concat(chunks);
        const fullResponse = responseHeaders + '\r\n';
        try {
          interceptor.write(fullResponse);
          interceptor.write(body);
          interceptor.end();
        } catch (e) {
          // socket 可能已关闭
        }

        console.log(`[${reqTime}] ${clientIP} | ${method} ${fullUrl} → ${realRes.statusCode}`);

        saveCaptureLog({
          type: 'https',
          clientIP: clientIP,
          method,
          url: fullUrl,
          host,
          requestHeaders: reqHeaders,
          requestBody: (() => {
            const cl = parseInt(reqHeaders['content-length']) || 0;
            return cl > 0 ? bodyHead.substring(0, Math.min(cl, 10000)) : '';
          })(),
          responseStatus: realRes.statusCode,
          responseHeaders: realRes.headers,
          responseBody: responseBody.substring(0, 10000),
          timestamp: new Date().toISOString(),
        });
      });
    });

    realReq.on('error', (e) => {
      console.log(`[${reqTime}] ${method} ${fullUrl} → ERR ${e.message}`);
      try {
        const errRes = `HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n`;
        interceptor.write(errRes);
        interceptor.end();
      } catch (_) {}
    });

    // 处理请求体
    const contentLength = parseInt(reqHeaders['content-length']) || 0;
    if (contentLength > 0 && bodyHead.length >= contentLength) {
      realReq.write(bodyHead.substring(0, contentLength));
      realReq.end();
    } else {
      realReq.end(bodyHead.length > 0 ? bodyHead : undefined);
    }
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

// 全局未捕获异常兜底（防止 socket 异常导致进程崩溃）
process.on('uncaughtException', (err) => {
  if (err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.code === 'ECONNABORTED') {
    console.error('[proxy] 连接异常(已恢复):', err.code, err.message);
    return;
  }
  console.error('[proxy] 未捕获异常，进程退出:', err);
  process.exit(1);
});
