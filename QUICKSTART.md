# 🚀 快速开始指南

## 一、安装（已完成）

代理服务已安装并启动！

- **项目目录**: `/home/ubuntu/.openclaw/workspace/proxy-server`
- **代理端口**: `8080`
- **服务器IP**: `10.0.0.17`

## 二、管理命令

```bash
cd /home/ubuntu/.openclaw/workspace/proxy-server

# 启动服务
./manage.sh start

# 停止服务
./manage.sh stop

# 重启服务
./manage.sh restart

# 查看状态
./manage.sh status

# 查看服务日志
./manage.sh logs

# 查看抓包日志
./manage.sh capture     # 查看今天的抓包
./manage.sh capture -f  # 实时跟踪抓包

# 查看 CA 证书信息
./manage.sh cert
```

## 三、客户端配置

### 1. 下载并安装 CA 证书

**下载证书：**
```bash
# 方法1：浏览器访问
http://10.0.0.17:8888/ca.crt

# 方法2：命令行
curl -O http://10.0.0.17:8888/ca.crt
```

**安装证书：** 详见 `CLIENT_SETUP.md`

### 2. 设置代理

- **代理地址**: `10.0.0.17`
- **代理端口**: `8080`
- **代理类型**: HTTP

**各平台设置方法：** 详见 `CLIENT_SETUP.md`

## 四、测试

### 在服务端测试

```bash
# 测试 HTTP
curl -v http://example.com --proxy http://127.0.0.1:8080

# 测试 HTTPS（需要 --cacert 参数）
curl -v https://example.com --proxy http://127.0.0.1:8080 \
  --cacert /home/ubuntu/.openclaw/workspace/proxy-server/certs/ca.crt
```

### 查看抓包结果

```bash
# 实时查看抓包日志
./manage.sh capture -f

# 或手动查看
cat logs/capture-$(date +%Y-%m-%d).json | jq .
```

## 五、Systemd 服务（可选）

如需使用 systemd 管理：

```bash
# 安装服务
sudo cp proxy-sniffer.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable proxy-sniffer
sudo systemctl start proxy-sniffer

# 查看状态
sudo systemctl status proxy-sniffer

# 查看日志
sudo journalctl -u proxy-sniffer -f
```

## 六、目录结构

```
proxy-server/
├── server.js                # 主服务程序
├── package.json            # 依赖配置
├── manage.sh               # 管理脚本 ✅
├── install.sh              # 安装脚本
├── README.md              # 使用文档
├── CLIENT_SETUP.md        # 客户端配置指南 ✅
├── QUICKSTART.md          # 本文件
├── proxy-sniffer.service  # Systemd 服务文件
├── certs/                 # 证书目录
│   ├── ca.key            # CA 私钥
│   └── ca.crt            # CA 证书 ✅
└── logs/                  # 抓包日志
    └── capture-*.json
```

## 七、常见问题

### 端口被占用
```bash
sudo netstat -tlnp | grep 8080
sudo kill -9 <PID>
```

### 证书不受信任
- 确认客户端已正确安装 CA 证书
- 重启浏览器
- Firefox 需要单独导入证书

### 抓不到 HTTPS 包
- 确认客户端已安装 CA 证书
- 确认代理设置正确
- 查看服务端日志：`./manage.sh logs`

## 八、安全提醒

⚠️ **重要：**
1. 此工具仅用于合法授权的安全测试
2. CA 私钥 (`certs/ca.key`) 请妥善保管
3. 不要在生产环境未经授权使用
4. 客户端安装 CA 证书后，代理可以解密所有 HTTPS 流量

---

## 九、下一步

1. ✅ 服务端已启动
2. ⏭️ 下载并安装 CA 证书到客户端
3. ⏭️ 配置客户端代理设置
4. ⏭️ 开始抓包测试！

如需帮助，查看：
- `README.md` - 完整文档
- `CLIENT_SETUP.md` - 客户端配置详解
- `./manage.sh status` - 检查服务状态
