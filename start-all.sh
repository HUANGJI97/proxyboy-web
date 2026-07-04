#!/bin/bash
# 启动所有服务的脚本

cd /home/ubuntu/.openclaw/workspace/proxy-server

echo "=== 停止所有旧服务 ==="
pkill -9 -f "node.*server.js" 2>/dev/null
pkill -9 -f "node.*web-server-fixed" 2>/dev/null
pkill -9 -f "node.*cert-server" 2>/dev/null
sleep 2

echo ""
echo "=== 启动代理服务 (8080) ==="
nohup node server.js start > /tmp/proxy.log 2>&1 &
PROXY_PID=$!
echo "PID: $PROXY_PID"
sleep 2

echo ""
echo "=== 启动 Web 服务 (3000) ==="
nohup node web-server-fixed.js > /tmp/web-fixed.log 2>&1 &
WEB_PID=$!
echo "PID: $WEB_PID"
sleep 2

echo ""
echo "=== 启动证书服务 (8888) ==="
nohup node cert-server.js > /tmp/cert.log 2>&1 &
CERT_PID=$!
echo "PID: $CERT_PID"
sleep 2

echo ""
echo "=== 验证服务状态 ==="
echo ""
echo "端口监听："
netstat -tlnp 2>/dev/null | grep -E "3000|8080|8888" || ss -tlnp 2>/dev/null | grep -E "3000|8080|8888"

echo ""
echo "测试访问："
echo "  Web (3000):"
curl -s -o /dev/null -w "    HTTP %{http_code}\n" http://127.0.0.1:3000/ 2>/dev/null || echo "    无法连接"

echo "  代理 (8080):"
curl -s -o /dev/null -w "    HTTP %{http_code}\n" http://127.0.0.1:8080/ 2>/dev/null || echo "    无法连接"

echo "  证书 (8888):"
curl -s -o /dev/null -w "    HTTP %{http_code}\n" http://127.0.0.1:8888/ 2>/dev/null || echo "    无法连接"

echo ""
echo "=== 启动完成 ==="
echo ""
echo "访问地址："
echo "  Web 管理: http://115.159.196.184:3000/"
echo "  代理地址: 115.159.196.184:8080"
echo "  证书下载: http://115.159.196.184:8888/"
