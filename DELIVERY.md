# 🎉 ProxySniffer 交付文档

## 项目完成时间
**2026-07-04 21:00**

---

## ✅ 交付内容

### 1. 核心功能（100% 完成）
- [x] HTTP/HTTPS 代理抓包
- [x] MITM 解密 HTTPS 流量
- [x] 实时日志展示
- [x] 专业 Web 管理界面（Proxyman 风格）
- [x] 请求/响应分区域展示
- [x] 一键导出 cURL 命令
- [x] URL 过滤和搜索

### 2. 服务部署（100% 完成）
- [x] 代理服务：`0.0.0.0:8080` ✅ 运行中
- [x] Web 管理：`0.0.0.0:3000` ✅ 运行中
- [x] 证书下载：`0.0.0.0:8888` ✅ 运行中

### 3. 文档（100% 完成）
- [x] README.md（项目说明）
- [x] QUICKSTART.md（快速开始）
- [x] WEB_GUIDE.md（Web 界面指南）
- [x] CLIENT_SETUP.md（客户端配置）
- [x] IOS_SETUP.md（iOS 详细配置）
- [x] PROXYMAN_STYLE.md（Proxyman 界面说明）✨ 新增
- [x] FINAL_SUMMARY.md（项目总结）

### 4. 管理工具（100% 完成）
- [x] manage.sh（一键管理脚本）
- [x] 启动/停止/重启/状态检查
- [x] 支持所有服务和单独控制

---

## 🌐 访问地址

### 服务地址
```
代理服务：   http://115.159.196.184:8080
Web 管理：   http://115.159.196.184:3000
证书下载：  http://115.159.196.184:8888
```

### Web 界面
```
Proxyman 风格（推荐）：http://115.159.196.184:3000/proxyman-style.html
简化版：            http://115.159.196.184:3000/index-simple.html
原版：              http://115.159.196.184:3000/
```

---

## 🚀 快速使用

### 3 步开始抓包

#### 步骤 1：配置代理
- **代理地址**：`115.159.196.184:8080`
- **iOS**：设置 → Wi-Fi → 配置代理 → 手动
- **Android**：设置 → WLAN → 代理 → 手动

#### 步骤 2：安装证书
1. 访问：`http://115.159.196.184:8888`
2. 下载 `ca.crt`
3. 安装并信任（iOS 需"启用完全信任"）

#### 步骤 3：访问界面
```
http://115.159.196.184:3000/proxyman-style.html
```

---

## 🎨 界面特点

### Proxyman 风格界面

#### 左侧：请求列表
- ✅ HTTP 方法彩色标签（GET/POST/PUT/DELETE）
- ✅ 状态码颜色区分（2xx 绿，4xx/5xx 红）
- ✅ URL、时间、大小信息
- ✅ 点击选中高亮

#### 右侧：详情面板（4 个标签）
1. **Overview（概览）**
   - General 信息
   - Request Headers 表格
   - Query Parameters 自动解析
   - Request Body JSON 高亮

2. **Request（请求）**
   - 请求头表格
   - 请求体展示
   - 原始客户端数据

3. **Response（响应）**
   - 响应头表格
   - 响应体展示
   - 原始服务器数据

4. **Raw Data（原始数据）**
   - 完整 JSON 日志
   - 一键复制按钮

#### 顶部工具栏
- 🔍 **搜索框**：实时过滤请求（按 URL/方法/状态码）
- 📋 **Copy as cURL**：导出为 cURL 命令
- 🗑️ **Clear**：清空所有日志

---

## 📊 功能对比

| 功能 | 原版 | 简化版 | Proxyman 版 ✨ |
|------|------|--------|-----------------|
| 深色主题 | ❌ | ❌ | ✅ |
| 分标签展示 | ✅ | ❌ | ✅ |
| 搜索过滤 | ✅ | ❌ | ✅ |
| 导出 cURL | ❌ | ❌ | ✅ |
| Query 参数 | ❌ | ❌ | ✅ |
| JSON 高亮 | ✅ | ❌ | ✅ |
| 稳定可靠 | ⚠️ | ✅ | ✅ |

**推荐：Proxyman 风格界面** ✨

---

## 🔧 管理命令

### 快速命令
```bash
cd /home/ubuntu/.openclaw/workspace/proxy-server

# 启动所有服务
./manage.sh start-all

# 查看状态
./manage.sh status

# 停止所有服务
./manage.sh stop-all
```

### 单独控制
```bash
./manage.sh proxy-start       # 启动代理
./manage.sh web-fixed-start   # 启动修复版 Web（推荐）
./manage.sh cert-start       # 启动证书下载
```

---

## 📁 项目文件

### 核心文件
```
proxy-server/
├── server.js                 # 代理服务器
├── web-server-fixed.js      # 修复版 Web 服务器 ✨ 推荐
├── cert-server.js           # 证书下载服务器
├── manage.sh                # 管理脚本
└── public/
    └── proxyman-style.html  # Proxyman 风格界面 ✨ 新增
```

### 证书文件
```
certs/
├── ca.key                  # CA 私钥（保密！）
├── ca.crt                 # CA 证书
└── index.html             # 证书下载页面
```

### 日志文件
```
logs/
└── capture-YYYY-MM-DD.json  # 每日抓包日志
```

---

## ⚠️ 重要提示

### 安全警告
1. **CA 私钥保密**：`certs/ca.key` 绝对不能泄露！
2. **仅授权使用**：只用于自己设备的测试
3. **合法合规**：遵守《网络安全法》等法律法规

### 使用限制
- ✅ 抓取自己设备的流量
- ✅ 用于开发和测试
- ❌ 不得抓取他人数据
- ❌ 不得用于非法监控

---

## 📞 技术支持

### 问题排查
1. **代理无法连接**：检查防火墙和安全组
2. **HTTPS 无法解密**：检查证书安装和信任
3. **界面加载失败**：检查 Web 服务状态
4. **展开功能问题**：使用 Proxyman 风格界面

### 日志位置
- 代理日志：`logs/capture-*.json`
- Web 日志：`/tmp/web-server-fixed.log`
- 证书日志：`/tmp/cert-server.log`

---

## 🎯 完成清单

- [x] 核心代理功能
- [x] HTTPS MITM 解密
- [x] Web 管理界面（3 个版本）
- [x] Proxyman 风格专业界面
- [x] 请求/响应分区域展示
- [x] cURL 导出功能
- [x] URL 过滤和搜索
- [x] 证书管理和下载
- [x] 多平台配置指南
- [x] 完整文档
- [x] 管理脚本
- [x] 服务部署和测试

---

## 🎉 项目状态：**已完成**

**所有功能已完成并测试通过！**

### 推荐使用方式
```bash
# 1. 访问 Proxyman 风格界面
http://115.159.196.184:3000/proxyman-style.html

# 2. 配置代理
# 代理地址：115.159.196.184:8080

# 3. 安装证书（如需 HTTPS）
# 访问：http://115.159.196.184:8888
```

---

**交付完成！开始使用吧！** 🎉🚀

*如有问题，请查看文档或联系支持。*
