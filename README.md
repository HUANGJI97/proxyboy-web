# HTTP/HTTPS 代理抓包服务

一个基于 Node.js 的 HTTP/HTTPS 代理服务器，支持流量抓包和解密。

## 功能特性

- ✅ HTTP 请求转发与抓包
- ✅ HTTPS 请求 MITM 解密
- ✅ 自动生成 CA 证书
- ✅ 请求/响应日志记录
- ✅ 支持 Systemd 服务管理

## 快速开始

### 1. 安装依赖

```bash
cd /home/ubuntu/.openclaw/workspace/proxy-server
chmod +x install.sh
./install.sh
```

或手动安装：

```bash
npm install
node server.js gen-ca  # 生成 CA 证书
```

### 2. 启动服务

```bash
# 前台运行（调试）
node server.js start -p 8080

# 后台服务
sudo systemctl start proxy-sniffer
```

### 3. 客户端配置

#### 3.1 下载 CA 证书

CA 证书位置：`certs/ca.crt`

```bash
# 启动 HTTP 服务器供下载
cd certs && python3 -m http.server 8888 &
# 然后访问 http://<服务器IP>:8888/ca.crt
```

#### 3.2 安装 CA 证书

**Windows:**
1. 双击 `ca.crt`
2. 点击 "安装证书"
3. 选择 "当前用户" 或 "本地计算机"
4. 选择 "将所有证书放入下列存储"
5. 选择 "受信任的根证书颁发机构"
6. 完成安装

**macOS:**
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ca.crt
```

**Android:**
1. 设置 → 安全 → 加密与凭据 → 安装证书 → CA 证书
2. 选择 `ca.crt`

**iOS:**
1. 通过 AirDrop/邮件发送 `ca.crt`
2. 设置 → 已下载的描述文件 → 安装
3. 设置 → 通用 → 关于本机 → 证书信任设置 → 开启完全信任

**Firefox (独立证书存储):**
1. 设置 → 隐私与安全 → 证书 → 查看证书
2. 导入 → 选择 `ca.crt` → 勾选 "信任此 CA 来标识网站"

#### 3.3 设置代理

**Windows (IE/Chrome):**
设置 → 代理设置 → 手动设置代理
- 地址：<服务器IP>
- 端口：8080

**macOS:**
系统设置 → 网络 → 高级 → 代理 → 网页代理(HTTP) / 安全网页代理(HTTPS)
- 服务器：<服务器IP>
- 端口：8080

**Android:**
长按 WiFi → 修改网络 → 高级选项 → 代理 → 手动
- 代理服务器：<服务器IP>
- 端口：8080

**iOS:**
设置 → WiFi → 点击 i 图标 → 配置代理 → 手动
- 服务器：<服务器IP>
- 端口：8080

## 使用方法

### 命令行

```bash
# 启动代理（默认端口 8080）
node server.js start

# 指定端口
node server.js start -p 8888

# 生成 CA 证书
node server.js gen-ca

# 查看 CA 证书信息
node server.js show-ca
```

### 查看抓包日志

日志保存在 `logs/capture-YYYY-MM-DD.json`：

```bash
# 实时查看日志
tail -f logs/capture-$(date +%Y-%m-%d).json

# 格式化查看
cat logs/capture-2026-07-04.json | jq .
```

## 目录结构

```
proxy-server/
├── server.js           # 主服务程序
├── package.json       # 依赖配置
├── install.sh         # 安装脚本
├── certs/            # 证书目录
│   ├── ca.key        # CA 私钥
│   └── ca.crt        # CA 证书
├── logs/             # 抓包日志
│   └── capture-*.json
└── README.md         # 本文件
```

## 注意事项

⚠️ **安全警告：**
1. 此工具仅用于合法授权的安全测试
2. 不要在生产环境未经授权使用
3. CA 私钥请妥善保管，不要泄露
4. 客户端安装 CA 证书后，代理可以解密所有 HTTPS 流量

## 故障排查

### 证书不受信任
- 确认 CA 证书已正确安装到客户端信任区
- 检查系统时间和证书有效期

### 无法捕获 HTTPS
- 确认客户端已设置代理
- 确认 CA 证书已安装并信任
- 检查防火墙是否阻止 8080 端口

### 连接超时
```bash
# 检查服务状态
sudo systemctl status proxy-sniffer

# 检查端口监听
netstat -tlnp | grep 8080
```

## 开发调试

```bash
# 前台运行查看详细日志
node server.js start

# 使用 curl 测试
export http_proxy=http://127.0.0.1:8080
export https_proxy=http://127.0.0.1:8080
curl -v http://example.com
curl -vk https://example.com
```

## 许可证

MIT License
