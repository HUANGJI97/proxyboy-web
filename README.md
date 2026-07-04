# ProxySniffer

HTTP/HTTPS 代理服务，支持抓包、解密和 Web 管理界面。

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式（前台运行，热更新）
```bash
npm run dev
```
- ✅ 前台运行，终端关闭自动停止
- ✅ 热更新：修改文件自动重启
- ✅ 适合开发调试

### 生产模式（后台运行）
```bash
npm start
```
- ✅ 后台运行，终端关闭不停止
- ✅ 日志输出到 `/tmp/proxy-sniffer.log`
- ✅ 适合生产环境

---

## 📋 所有可用命令

### 开发模式（前台 + 热更新）
| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动所有服务（代理 + Web） |
| `npm run dev:proxy` | 只启动代理服务（8888） |
| `npm run dev:web` | 只启动 Web 服务（8080） |

### 生产模式（后台）
| 命令 | 说明 |
|------|------|
| `npm start` | 启动所有服务（后台） |
| `npm run start:proxy` | 只启动代理服务（后台） |
| `npm run start:web` | 只启动 Web 服务（后台） |

### 停止服务
```bash
npm run stop
```

---

## 🌐 访问地址

启动后访问：

```
Web 管理界面：http://115.159.196.184:8080/admin.html
证书下载页面：http://115.159.196.184:8080/cert
代理服务地址：115.159.196.184:8888
```

---

## 🔧 开发说明

### 热更新
使用 `nodemon` 实现热更新：
- 修改 `proxy-only.js` → 自动重启代理服务
- 修改 `web-only-v2.js` → 自动重启 Web 服务
- 修改 `public/` → 自动重启 Web 服务

### 查看日志
```bash
# 开发模式（前台）
# 直接看终端输出

# 生产模式（后台）
tail -f /tmp/proxy-sniffer.log  # 所有服务
tail -f /tmp/proxy.log         # 代理服务
tail -f /tmp/web.log           # Web 服务
```

---

## 📁 项目结构

```
proxy-server/
├── proxy-only.js        # 代理服务（端口 8888）
├── web-only-v2.js       # Web 管理服务（端口 8080）
├── server-single-port.js # 单端口版本（8080）
├── public/
│   ├── admin.html          # 管理界面（带代理服务状态）
│   ├── proxyman-style.html # Proxyman 风格界面
│   └── service-manager.html # 服务管理界面
├── certs/
│   ├── ca.crt            # CA 证书（公钥）
│   └── ca.key            # CA 私钥（不要提交）
├── logs/
│   └── capture-*.json   # 抓包日志
├── package.json
└── README.md
```

---

## ⚠️ 注意事项

1. **首次使用** 需要生成 CA 证书：
   - 启动服务会自动生成 `certs/ca.key` 和 `certs/ca.crt`
   - 客户端需要安装 `certs/ca.crt` 并信任

2. **`certs/ca.key` 不要提交到 Git**
   - 已加入 `.gitignore`

3. **端口占用**
   - 8080：Web 管理服务
   - 8888：代理服务
   - 确保这些端口未被占用

---

## 🐛 常见问题

### 端口被占用
```bash
# 查看端口占用
netstat -tlnp | grep -E "8080|8888"

# 停止服务
npm run stop
```

### 热更新不生效
```bash
# 确保 nodemon 已安装
npm install -g nodemon

# 检查 nodemon 版本
nodemon --version
```

### 日志文件过大
```bash
# 清空日志
echo > /tmp/proxy-sniffer.log
echo > /tmp/proxy.log
echo > /tmp/web.log
```

---

## 📝 更新日志

### v1.0.0 (2026-07-05)
- ✅ 实现 HTTP/HTTPS 代理抓包
- ✅ 实现 Web 管理界面
- ✅ 实现证书下载页面
- ✅ 实现代理服务状态检测和控制
- ✅ 实现热更新（开发模式）
- ✅ 实现后台运行（生产模式）

---

## 📄 许可证

MIT License

---

**Happy Debugging! 🎉**
