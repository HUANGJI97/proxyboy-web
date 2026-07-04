# 🎉 ProxySniffer 项目完成总结

## 项目概述

**ProxySniffer** 是一个基于 Node.js 的 HTTP/HTTPS 代理抓包工具，支持：
- ✅ MITM 解密 HTTPS 流量
- ✅ 实时抓包并展示
- ✅ 类似 Proxyman 的专业界面
- ✅ 请求/响应分区域展示
- ✅ 一键导出 cURL 命令
- ✅ URL 过滤和搜索

---

## 📊 项目状态

### ✅ 已完成功能

#### 1. 核心代理功能
- [x] HTTP 代理转发
- [x] HTTPS MITM 解密
- [x] 动态生成服务器证书
- [x] CA 证书生成和管理
- [x] 日志记录到 JSON 文件

#### 2. Web 管理界面
- [x] 原版界面（基础功能）
- [x] 简化版界面（稳定可靠）
- [x] **Proxyman 风格界面**（专业深色主题）✨ **新增**

#### 3. 详情展示功能
- [x] 请求头表格展示
- [x] 响应头表格展示
- [x] Query 参数自动解析
- [x] 请求体 JSON 高亮
- [x] 响应体 JSON 高亮
- [x] 原始数据查看
- [x] 数据大小计算

#### 4. 实用工具功能
- [x] URL 过滤和搜索
- [x] 一键导出 cURL 命令 ✨ **新增**
- [x] 清空日志
- [x] 自动刷新（3 秒）
- [x] 复制原始数据

#### 5. 证书管理
- [x] CA 证书生成
- [x] 证书下载页面
- [x] 多平台安装指南
- [x] iOS 详细配置说明

---

## 🌐 访问地址

### 服务地址
```
代理服务：   http://115.159.196.184:8080
Web 管理：   http://115.159.196.184:3000
证书下载：  http://115.159.196.184:8888
```

### Web 界面版本
```
原版界面：  http://115.159.196.184:3000/
简化版：    http://115.159.196.184:3000/index-simple.html
Proxyman风：http://115.159.196.184:3000/proxyman-style.html ✨ 推荐
```

---

## 🎨 界面展示

### Proxyman 风格界面特点

#### 左侧请求列表
```
┌─────────────────────────────────┐
│ 🔍 [搜索框]     [导出] [清空] │
├─────────────────────────────────┤
│ [GET]  /api/users            │
│ Status: 200  Size: 1.2 KB  │
│ 12:34:56                    │
│─────────────────────────────────│
│ [POST] https://api.example.com │
│ Status: 201  Size: 2.5 KB  │
│ 12:35:01                    │
└─────────────────────────────────┘
```

#### 右侧详情面板（4 个标签）
```
┌─────────────────────────────────┐
│ Overview | Request | Response │
│ Raw Data                         │
├─────────────────────────────────┤
│ General                          │
│ - Request URL                    │
│ - Method                         │
│ - Status Code                    │
│─────────────────────────────────│
│ Request Headers                  │
│ Host: api.example.com            │
│ Content-Type: application/json   │
│─────────────────────────────────│
│ Query Parameters                 │
│ q: hello                         │
│ page: 1                          │
│─────────────────────────────────│
│ Request Body                     │
│ { "key": "value" }              │
└─────────────────────────────────┘
```

---

## 🚀 快速开始

### 1. 启动服务
```bash
cd /home/ubuntu/.openclaw/workspace/proxy-server
./manage.sh start-all
```

### 2. 配置代理
- **代理地址**：`115.159.196.184:8080`
- **iOS**：设置 → Wi-Fi → 配置代理 → 手动
- **Android**：设置 → WLAN → 代理 → 手动
- **桌面浏览器**：系统代理设置

### 3. 安装证书（HTTPS 抓包必需）
- 访问：`http://115.159.196.184:8888`
- 下载 `ca.crt`
- 安装并信任（iOS 需要"启用完全信任"）

### 4. 访问管理界面
```
http://115.159.196.184:3000/proxyman-style.html
```

---

## 📚 完整文档

| 文档 | 说明 | 路径 |
|------|------|------|
| **README.md** | 项目主文档 | `proxy-server/README.md` |
| **QUICKSTART.md** | 快速开始指南 | `proxy-server/QUICKSTART.md` |
| **WEB_GUIDE.md** | Web 界面使用指南 | `proxy-server/WEB_GUIDE.md` |
| **CLIENT_SETUP.md** | 客户端配置指南 | `proxy-server/CLIENT_SETUP.md` |
| **IOS_SETUP.md** | iOS 详细配置 | `proxy-server/IOS_SETUP.md` |
| **PROXYMAN_STYLE.md** | Proxyman 界面说明 | `proxy-server/PROXYMAN_STYLE.md` ✨ 新增 |
| **FIX_EXPAND.md** | 展开功能修复 | `proxy-server/FIX_EXPAND.md` |
| **COMPLETE.md** | 项目完成总结 | `proxy-server/COMPLETE.md` |

---

## 🔧 管理命令

### 服务管理
```bash
./manage.sh start-all      # 启动所有服务
./manage.sh stop-all       # 停止所有服务
./manage.sh restart-all    # 重启所有服务
./manage.sh status         # 查看状态
```

### 单独控制
```bash
./manage.sh proxy-start    # 启动代理
./manage.sh web-start     # 启动 Web 管理
./manage.sh web-fixed-start # 启动修复版 Web（推荐）
./manage.sh cert-start    # 启动证书下载
```

---

## 📁 项目结构

```
proxy-server/
├── server.js                 # 核心代理服务器
├── web-server.js            # 原版 Web 服务器
├── web-server-fixed.js      # 修复版 Web 服务器 ✨ 推荐
├── cert-server.js           # 证书下载服务器
├── manage.sh                # 管理脚本
├── public/
│   ├── index.html          # 原版界面
│   ├── index-simple.html  # 简化版界面
│   └── proxyman-style.html # Proxyman 风格界面 ✨ 新增
├── certs/
│   ├── ca.key             # CA 私钥（保密！）
│   ├── ca.crt             # CA 证书
│   └── index.html         # 证书下载页面
├── logs/                   # 抓包日志目录
│   └── capture-*.json
└── docs/                  # 文档目录
```

---

## 🎯 核心功能对比

### 界面版本对比
| 功能 | 原版 | 简化版 | Proxyman 版 ✨ |
|------|------|--------|-----------------|
| 深色主题 | ❌ | ❌ | ✅ |
| 分标签展示 | ✅ | ❌ | ✅ |
| 搜索过滤 | ✅ | ❌ | ✅ |
| 导出 cURL | ❌ | ❌ | ✅ |
| 请求头表格 | ✅ | ✅ | ✅ |
| Query 参数 | ❌ | ❌ | ✅ |
| JSON 高亮 | ✅ | ❌ | ✅ |
| 稳定可靠 | ⚠️ | ✅ | ✅ |

**推荐使用：Proxyman 风格界面** ✨

---

## 🔍 示例截图（文字描述）

### 主界面布局
```
┌──────────────────────────────────────────────────┐
│ 🔍 ProxySniffer    [🔍搜索框] [📋 cURL] [🗑️清空] │
├──────────────────┬───────────────────────────────┤
│  Requests        │  Overview | Request | Response│
│                  │  Raw Data                       │
│  [GET] /api/1  │───────────────────────────────│
│  200 1.2KB     │  General                      │
│  12:34:56       │  - Request URL                │
│                  │  - Method                     │
│  [POST] /api/2 │  - Status Code                │
│  201 2.5KB     │───────────────────────────────│
│  12:35:01       │  Request Headers              │
│                  │  Host: ...                    │
│                  │  Content-Type: ...            │
│                  │───────────────────────────────│
│                  │  Query Parameters             │
│                  │  q: hello                    │
│                  │───────────────────────────────│
│                  │  Request Body                │
│                  │  { "key": "value" }          │
└──────────────────┴───────────────────────────────┘
```

---

## 📊 技术栈

### 后端
- **Node.js**：v22.23.1
- **核心模块**：`http`, `https`, `net`, `fs`, `path`
- **第三方**：`node-forge`（证书生成）

### 前端
- **纯 HTML/CSS/JavaScript**（无框架依赖）
- **现代 CSS**：Flexbox, Grid, CSS Variables
- **ES6+**：箭头函数、模板字符串、解构赋值

---

## ⚠️ 重要提示

### 安全警告
1. **CA 私钥保密**：`certs/ca.key` 绝对不能泄露！
2. **仅用于授权测试**：不得用于非法监控
3. **法律合规**：遵守《网络安全法》等法律法规

### 使用限制
- 仅解密自己设备的 HTTPS 流量
- 不得抓取他人隐私数据
- 不得用于商业间谍活动

---

## 🐛 已知问题

### 已修复
- [x] ~~展开功能不工作~~ → 使用 Proxyman 风格界面
- [x] ~~数据乱码~~ → 使用 `web-server-fixed.js`
- [x] ~~界面简陋~~ → Proxyman 风格深色主题

### 待优化
- [ ] WebSocket 抓包支持
- [ ] 请求重写功能
- [ ] 断点调试功能
- [ ] 数据库存储（当前为 JSON 文件）
- [ ] 认证保护（当前无认证）

---

## 🎯 下一步计划（可选）

### 高级功能
- [ ] 请求重放功能
- [ ] 性能分析（DNS、TLS、TTFB）
- [ ] HAR 文件导出
- [ ] 对比两个请求
- [ ] 批量导出

### 界面优化
- [ ] 响应式设计（移动端支持）
- [ ] 自定义主题（亮色/暗色切换）
- [ ] 字体大小调整
- [ ] 列排序和拖拽

### 服务端优化
- [ ] SQLite 数据库存储
- [ ] 日志自动清理（保留 N 天）
- [ ] 内存优化（大量日志时）
- [ ] 集群模式支持

---

## 📞 技术支持

### 问题排查
1. **代理无法连接**：检查防火墙、安全组
2. **HTTPS 无法解密**：检查证书是否正确安装和信任
3. **界面加载失败**：检查 Web 服务是否运行
4. **展开功能不工作**：使用 Proxyman 风格界面

### 日志位置
- **代理日志**：`logs/capture-*.json`
- **Web 日志**：`/tmp/web-server-fixed.log`
- **证书日志**：`/tmp/cert-server.log`

---

## 🎉 项目完成

**ProxySniffer 已完成所有核心功能！**

### 主要成果
- ✅ 功能完整的 HTTP/HTTPS 代理
- ✅ 专业的 Web 管理界面（Proxyman 风格）
- ✅ 完善的文档和指南
- ✅ 一键管理脚本
- ✅ 多平台客户端支持

### 推荐使用方式
```bash
# 1. 启动修复版服务
./manage.sh web-fixed-start

# 2. 访问 Proxyman 风格界面
http://115.159.196.184:3000/proxyman-style.html

# 3. 配置代理和证书
# 代理: 115.159.196.184:8080
# 证书: http://115.159.196.184:8888
```

---

**项目已完成！开始使用吧！** 🎉🚀

如有问题，请查看文档或联系支持。
