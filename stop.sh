#!/bin/bash

echo "=== 停止 ProxySniffer 服务 ==="
echo ""

# 停止 nodemon 进程
echo "停止 nodemon 进程..."
pkill -f "nodemon.*proxy" 2>/dev/null
pkill -f "nodemon.*web" 2>/dev/null

# 停止 node 进程
echo "停止 node 进程..."
pkill -f "node.*proxy-only" 2>/dev/null
pkill -f "node.*web-only" 2>/dev/null

sleep 1

# 验证
echo ""
echo "=== 验证服务已停止 ==="
if netstat -tlnp 2>/dev/null | grep -E "8080|8888" || ss -tlnp 2>/dev/null | grep -E "8080|8888"; then
    echo "⚠️  仍有服务在运行"
else
    echo "✅ 所有服务已停止"
fi
