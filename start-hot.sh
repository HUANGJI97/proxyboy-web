#!/bin/bash

# ProxySniffer 智能启动脚本
# 支持热更新（自动重启）

cd /home/ubuntu/.openclaw/workspace/proxy-server

echo "=== ProxySniffer 启动脚本 ==="
echo ""

# 检查是否安装了 nodemon
if ! command -v nodemon &> /dev/null; then
    echo "⚠️  nodemon 未安装，正在安装..."
    npm install -g nodemon
fi

# 停止旧服务
echo "=== 停止旧服务 ==="
pkill -f "node.*server" 2>/dev/null
pkill -f "proxy-only" 2>/dev/null
pkill -f "web-only" 2>/dev/null
pkill -f "nodemon.*proxy" 2>/dev/null
pkill -f "nodemon.*web" 2>/dev/null
sleep 1

echo ""
echo "=== 启动代理服务（8888，热更新）==="
nodemon --watch proxy-only.js --watch certs/ --delay 2 proxy-only.js > /tmp/proxy.log 2>&1 &
PROXY_PID=$!
echo "代理服务 PID: $PROXY_PID"

sleep 1

echo ""
echo "=== 启动 Web 管理服务（8080，热更新）==="
nodemon --watch web-only-v2.js --watch public/ --watch certs/ --delay 2 web-only-v2.js > /tmp/web.log 2>&1 &
WEB_PID=$!
echo "Web 服务 PID: $WEB_PID"

sleep 2

echo ""
echo "=== 验证端口监听 ==="
netstat -tlnp 2>/dev/null | grep -E "8080|8888" || ss -tlnp 2>/dev/null | grep -E "8080|8888"

echo ""
echo "=== ✅ 启动完成 ==="
echo ""
echo "访问地址："
echo "  Web 管理：http://115.159.196.184:8080/admin.html"
echo "  证书下载：http://115.159.196.184:8080/cert"
echo "  代理服务：115.159.196.184:8888"
echo ""
echo "热更新已启用："
echo "  - 修改 proxy-only.js 会自动重启代理服务"
echo "  - 修改 web-only-v2.js 或 public/ 会自动重启 Web 服务"
echo ""
echo "查看日志："
echo "  tail -f /tmp/proxy.log"
echo "  tail -f /tmp/web.log"
echo ""
echo "停止服务："
echo "  pkill -f nodemon"
