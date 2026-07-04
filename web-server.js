#!/usr/bin/env node

/**
 * 管理端 API 服务器
 * 提供 Web UI 和日志查询 API
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const CONFIG = {
  port: 3000,
  proxyLogDir: path.join(__dirname, "logs"),
  publicDir: path.join(__dirname, "public"),
};

// 读取抓包日志
function getCaptureLogs() {
  try {
    const files = fs.readdirSync(CONFIG.proxyLogDir)
      .filter(f => f.startsWith("capture-") && f.endsWith(".json"))
      .sort()
      .reverse();
    
    let allLogs = [];
    for (const file of files) {
      const filepath = path.join(CONFIG.proxyLogDir, file);
      try {
        const content = fs.readFileSync(filepath, "utf8");
        const logs = JSON.parse(content);
        allLogs = allLogs.concat(logs);
      } catch (e) {
        console.error("读取日志文件失败: " + file, e);
      }
    }
    
    return allLogs;
  } catch (e) {
    console.error("读取日志目录失败:", e);
    return [];
  }
}

// 清空日志
function clearLogs() {
  try {
    const files = fs.readdirSync(CONFIG.proxyLogDir)
      .filter(f => f.startsWith("capture-") && f.endsWith(".json"));
    
    for (const file of files) {
      fs.unlinkSync(path.join(CONFIG.proxyLogDir, file));
    }
    return true;
  } catch (e) {
    console.error("清空日志失败:", e);
    return false;
  }
}

// 静态文件服务
function serveStaticFile(res, filepath) {
  const ext = path.extname(filepath);
  const contentTypeMap = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
  };
  
  const contentType = contentTypeMap[ext] || "application/octet-stream";
  
  try {
    const content = fs.readFileSync(filepath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch (e) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  }
}

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://" + req.headers.host);
  const pathname = url.pathname;
  
  // CORS 头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // API: 获取日志
  if (pathname === "/api/logs" && req.method === "GET") {
    const logs = getCaptureLogs();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ logs }));
    return;
  }
  
  // API: 清空日志
  if (pathname === "/api/logs/clear" && req.method === "POST") {
    const success = clearLogs();
    res.writeHead(success ? 200 : 500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success }));
    return;
  }
  
  // API: 获取统计
  if (pathname === "/api/stats" && req.method === "GET") {
    const logs = getCaptureLogs();
    const stats = {
      total: logs.length,
      http: logs.filter(l => l.type === "http").length,
      https: logs.filter(l => l.type === "https").length,
      errors: logs.filter(l => l.responseStatus >= 400).length,
    };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(stats));
    return;
  }
  
  // 静态文件
  if (pathname === "/" || pathname === "/index.html") {
    serveStaticFile(res, path.join(CONFIG.publicDir, "index.html"));
    return;
  }
  
  // 其他静态文件
  const filepath = path.join(CONFIG.publicDir, pathname);
  if (fs.existsSync(filepath) && fs.statSync(filepath).isFile()) {
    serveStaticFile(res, filepath);
    return;
  }
  
  // 404
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("404 Not Found");
});

server.listen(CONFIG.port, '0.0.0.0', () => {
  console.log("管理端服务器启动成功！");
  console.log("浏览器访问: http://localhost:" + CONFIG.port);
  console.log("或访问: http://10.0.0.17:" + CONFIG.port);
  console.log("");
  console.log("按 Ctrl+C 停止服务");
});

// 优雅退出
process.on("SIGINT", () => {
  console.log("");
  console.log("正在停止服务...");
  server.close(() => {
    console.log("服务已停止");
    process.exit(0);
  });
});
