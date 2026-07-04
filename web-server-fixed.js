#!/usr/bin/env node

/**
 * 修复版 Web 管理端服务器
 * 解决数据乱码和展开问题
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  port: 3000,
  proxyLogDir: path.join(__dirname, 'logs'),
  publicDir: path.join(__dirname, 'public'),
};

// 获取所有日志的总数（用于统计）
function getAllLogsCount() {
  try {
    const files = fs.readdirSync(CONFIG.proxyLogDir)
      .filter(f => f.startsWith('capture-') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    let count = 0;
    for (const file of files) {
      const filepath = path.join(CONFIG.proxyLogDir, file);
      try {
        const content = fs.readFileSync(filepath, 'utf8');
        const logs = JSON.parse(content);
        count += logs.length;
      } catch (e) {
        // 忽略错误
      }
    }
    return count;
  } catch (e) {
    return 0;
  }
}

// 读取抓包日志 - 优化：限制加载数量，避免页面卡死
const MAX_LOGS = 100; // 最多加载 100 条

function getCaptureLogs(limit = MAX_LOGS) {
  try {
    const files = fs.readdirSync(CONFIG.proxyLogDir)
      .filter(f => f.startsWith('capture-') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    let allLogs = [];
    for (const file of files) {
      if (allLogs.length >= limit) break; // 达到限制就停止
      
      const filepath = path.join(CONFIG.proxyLogDir, file);
      try {
        const content = fs.readFileSync(filepath, 'utf8');
        const logs = JSON.parse(content);
        // 过滤掉二进制数据，只保留可读文本
        const cleanLogs = logs.map(log => {
          const clean = { ...log };
          // 如果 responseBody 是二进制，尝试转为字符串
          if (clean.responseBody && typeof clean.responseBody === 'string') {
            // 移除不可打印字符
            clean.responseBody = clean.responseBody.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
          }
          if (clean.clientData && typeof clean.clientData === 'string') {
            clean.clientData = clean.clientData.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
          }
          if (clean.serverData && typeof clean.serverData === 'string') {
            clean.serverData = clean.serverData.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
          }
          return clean;
        });
        allLogs = allLogs.concat(cleanLogs);
      } catch (e) {
        console.error(`读取日志文件失败: ${file}`, e);
      }
    }
    
    return allLogs;
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

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // API: 获取日志（支持 limit 参数）
  if (pathname === '/api/logs' && req.method === 'GET') {
    const urlParams = new URL(req.url, `http://${req.headers.host}`);
    const limit = parseInt(urlParams.searchParams.get('limit')) || 100; // 默认 100 条
    const logs = getCaptureLogs(limit);
    const total = getAllLogsCount(); // 获取总数量
    
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ 
      logs,
      total,
      loaded: logs.length,
      limit
    }));
    return;
  }
  
  // API: 清空日志
  if (pathname === '/api/logs/clear' && req.method === 'POST') {
    try {
      const files = fs.readdirSync(CONFIG.proxyLogDir)
        .filter(f => f.startsWith('capture-') && f.endsWith('.json'));
      for (const file of files) {
        fs.unlinkSync(path.join(CONFIG.proxyLogDir, file));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false }));
    }
    return;
  }
  
  // 静态文件 - 默认首页改为 proxyman-style.html
  if (pathname === '/' || pathname === '/index.html') {
    serveStaticFile(res, path.join(CONFIG.publicDir, 'proxyman-style.html'));
    return;
  }
  
  // 其他静态文件
  const filepath = path.join(CONFIG.publicDir, pathname);
  if (fs.existsSync(filepath) && fs.statSync(filepath).isFile()) {
    serveStaticFile(res, filepath);
    return;
  }
  
  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(CONFIG.port, '0.0.0.0', () => {
  console.log('管理端服务器启动成功！');
  console.log(`浏览器访问: http://localhost:${CONFIG.port}`);
  console.log(`或访问: http://115.159.196.184:${CONFIG.port}`);
  console.log('\n按 Ctrl+C 停止服务');
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在停止服务...');
  server.close(() => {
    console.log('服务已停止');
    process.exit(0);
  });
});
