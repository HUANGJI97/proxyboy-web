#!/bin/bash

# 公网访问自动化配置脚本
# 用于开放代理服务和 Web 管理端端口

echo "========================================="
echo "  公网访问配置脚本"
echo "========================================="
echo ""

# 公网 IP
PUBLIC_IP="115.159.196.184"

# 需要开放的端口
PORTS=(8080 3000 8888)
PORT_NAMES=("代理服务" "Web 管理端" "证书下载")

echo "服务器公网 IP: $PUBLIC_IP"
echo ""

# 检查服务是否运行
echo "=== 1. 检查服务状态 ==="
for i in "${!PORTS[@]}"; do
    port="${PORTS[$i]}"
    name="${PORT_NAMES[$i]}"
    if netstat -tln 2>/dev/null | grep -q ":$port " || ss -tln | grep -q ":$port "; then
        echo "✅ $name (端口 $port) 正在监听"
    else
        echo "❌ $name (端口 $port) 未监听"
    fi
done

echo ""
echo "=== 2. 配置防火墙 ==="

# 检查是否有 root 权限
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  需要 root 权限配置防火墙"
    echo "请运行: sudo $0"
    SUDO_NEEDED=true
fi

# 尝试配置 ufw
if command -v ufw &> /dev/null; then
    echo "检测到 ufw 防火墙"
    
    if [ "$SUDO_NEEDED" = true ]; then
        echo "请手动运行以下命令："
        echo ""
        for port in "${PORTS[@]}"; do
            echo "  sudo ufw allow $port/tcp"
        done
        echo ""
        echo "然后运行: sudo ufw reload"
    else
        for port in "${PORTS[@]}"; do
            echo "开放端口 $port..."
            sudo ufw allow $port/tcp
        done
        sudo ufw reload
        echo "✅ ufw 规则已添加"
    fi

# 尝试配置 iptables
elif command -v iptables &> /dev/null; then
    echo "检测到 iptables 防火墙"
    
    if [ "$SUDO_NEEDED" = true ]; then
        echo "请手动运行以下命令："
        echo ""
        for port in "${PORTS[@]}"; do
            echo "  sudo iptables -A INPUT -p tcp --dport $port -j ACCEPT"
        done
        echo ""
        echo "保存规则（根据系统选择）："
        echo "  Ubuntu: sudo iptables-save | sudo tee /etc/iptables/rules.v4"
        echo "  CentOS: sudo service iptables save"
    else
        for port in "${PORTS[@]}"; do
            echo "开放端口 $port..."
            sudo iptables -A INPUT -p tcp --dport $port -j ACCEPT
        done
        echo "✅ iptables 规则已添加"
        
        # 尝试保存规则
        if command -v iptables-save &> /dev/null; then
            if [ -d /etc/iptables ]; then
                sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null
                echo "✅ 规则已保存到 /etc/iptables/rules.v4"
            elif command -v service &> /dev/null; then
                sudo service iptables save 2>/dev/null && echo "✅ 规则已保存"
            fi
        fi
    fi
else
    echo "未检测到 ufw 或 iptables"
    echo "⚠️  请手动配置云服务器安全组！"
fi

echo ""
echo "=== 3. 云服务器安全组配置 ==="
echo ""
echo "如果服务器是云服务器（腾讯云/阿里云/华为云等），"
echo "还需要在云控制台配置安全组规则！"
echo ""
echo "快速链接："
echo "  - 腾讯云: https://console.cloud.tencent.com/cvm/securitygroup"
echo "  - 阿里云: https://ecs.console.aliyun.com/"
echo "  - 华为云: https://console.huaweicloud.com/ecm/"
echo ""
echo "需要开放的端口："
echo "  ┌────────────┬──────────┬────────────────┐"
echo "  │ 端口       │ 用途     │ 协议           │"
echo "  ├────────────┼──────────┼────────────────┤"
echo "  │ 8080      │ 代理服务 │ TCP            │"
echo "  │ 3000      │ Web 管理 │ TCP            │"
echo "  │ 8888      │ 证书下载 │ TCP            │"
echo "  └────────────┴──────────┴────────────────┘"
echo ""
echo "来源建议："
echo "  - 代理服务 (8080): 0.0.0.0/0（所有 IP）"
echo "  - Web 管理 (3000): 你的 IP/32（限制访问）"
echo "  - 证书下载 (8888): 0.0.0.0/0（所有 IP）"

echo ""
echo "=== 4. 验证配置 ==="
echo ""
echo "配置完成后，运行以下命令测试："
echo ""
echo "  # 本地测试"
echo "  curl -v http://$PUBLIC_IP:3000/"
echo "  curl -v http://$PUBLIC_IP:8080/"
echo "  curl -v http://$PUBLIC_IP:8888/ca.crt"
echo ""
echo "  # 浏览器访问"
echo "  打开: http://$PUBLIC_IP:3000/"
echo ""
echo "如果无法访问，可能原因："
echo "  1. 云服务器安全组未配置"
echo "  2. 系统防火墙未开放端口"
echo "  3. 服务未正确监听 0.0.0.0"
echo ""
echo "========================================="
echo "配置完成后，访问地址："
echo ""
echo "  Web 管理端: http://$PUBLIC_IP:3000"
echo "  代理服务:   $PUBLIC_IP:8080"
echo "  证书下载:   http://$PUBLIC_IP:8888/ca.crt"
echo "========================================="
echo ""
