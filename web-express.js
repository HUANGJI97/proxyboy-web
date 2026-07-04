const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
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
    // 检查 8080 端口（Web 服务）
    let webRunning = false;
    try {
      execSync('netstat -tlnp 2>/dev/null | grep :8080 || ss -tlnp 2>/dev/null | grep :8080', { stdio: 'pipe' });
      webRunning = true;
    } catch (e) {}
    
    // 检查 8888 端口（代理服务）
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
  const filePath = path.join(__dirname, 'public', 'admin.html');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.set('Content-Type', 'text/html');
    res.send(content);
  } catch (e) {
    res.status(404).end('File not found');
  }
});

// 路由：/admin.html
webApp.get('/admin.html', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'admin.html');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.set('Content-Type', 'text/html');
    res.send(content);
  } catch (e) {
    res.status(404).end('File not found');
  }
});

// 路由：/manager -> service-manager.html
webApp.get('/manager', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'service-manager.html');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.set('Content-Type', 'text/html');
    res.send(content);
  } catch (e) {
    res.status(404).end('File not found');
  }
});

// 路由：/cert -> 证书下载页面
webApp.get('/cert', (req, res) => {
  const filePath = path.join(__dirname, 'certs', 'index.html');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.set('Content-Type', 'text/html');
    res.send(content);
  } catch (e) {
    res.status(404).end('File not found');
  }
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
  console.log(`\n调试模式: ${CONFIG.debug ? '开启' : '关闭'}`);
  console.log(`\n按 Ctrl+C 停止服务`);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在停止服务...');
  webServer.close(() => {
    console.log('服务已停止');
    process.exit(0);
  });
});
