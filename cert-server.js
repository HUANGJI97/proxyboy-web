#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  port: 8888,
  certsDir: path.join(__dirname, 'certs'),
};

const server = http.createServer((req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (url === '/ca.crt' || url === '/download') {
    const certPath = path.join(CONFIG.certsDir, 'ca.crt');
    if (fs.existsSync(certPath)) {
      res.writeHead(200, {
        'Content-Type': 'application/x-x509-ca-cert',
        'Content-Disposition': 'attachment; filename="ProxySniffer_CA.crt"',
      });
      fs.createReadStream(certPath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Certificate not found');
    }
    return;
  }
  
  const filepath = path.join(CONFIG.certsDir, url);
  if (fs.existsSync(filepath) && fs.statSync(filepath).isFile()) {
    const ext = path.extname(filepath);
    const contentTypeMap = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.crt': 'application/x-x509-ca-cert',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filepath).pipe(res);
  } else {
    const indexPage = path.join(CONFIG.certsDir, 'index.html');
    if (fs.existsSync(indexPage)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(indexPage).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  }
});

server.listen(CONFIG.port, '0.0.0.0', () => {
  console.log('CA Certificate Server started!');
  console.log(`Access URL: http://115.159.196.184:${CONFIG.port}`);
});

process.on('SIGINT', () => {
  console.log('\nStopping server...');
  server.close(() => process.exit(0));
});
