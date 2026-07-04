#!/bin/bash

# 代理服务器一键安装脚本
# 适用于 Ubuntu/Debian 系统

set -e

echo "========================================="
echo "  HTTP/HTTPS 代理抓包服务 - 安装脚本"
echo "========================================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，正在安装..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js 已安装: $(node --version)"
fi

# 项目目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "📦 安装依赖..."
npm install

echo ""
echo "🔑 生成 CA 证书..."
node server.js gen-ca

echo ""
echo "📋 创建系统服务..."
cat > /tmp/proxy-sniffer.service << EOF
[Unit]
Description=HTTP/HTTPS Proxy Sniffer
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/node $PROJECT_DIR/server.js start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo mv /tmp/proxy-sniffer.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable proxy-sniffer
sudo systemctl start proxy-sniffer

echo ""
echo "========================================="
echo "✅ 安装完成！"
echo "========================================="
echo ""
echo "使用方法："
echo "  启动服务: sudo systemctl start proxy-sniffer"
echo "  停止服务: sudo systemctl stop proxy-sniffer"
echo "  查看状态: sudo systemctl status proxy-sniffer"
echo "  查看日志: sudo journalctl -u proxy-sniffer -f"
echo ""
echo "CA 证书位置: $PROJECT_DIR/certs/ca.crt"
echo "抓包日志目录: $PROJECT_DIR/logs/"
echo ""
echo "客户端配置："
echo "  1. 下载并安装 CA 证书到客户端信任区"
echo "  2. 设置代理: $(hostname -I | awk '{print $1}'):8080"
echo ""
