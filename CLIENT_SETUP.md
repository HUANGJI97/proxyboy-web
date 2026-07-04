# 客户端安装配置指南

## 一、下载 CA 证书

### 方法 1：浏览器下载
访问：http://10.0.0.17:8888/ca.crt

### 方法 2：命令行下载
```bash
# Linux/macOS
curl -O http://10.0.0.17:8888/ca.crt

# Windows PowerShell
Invoke-WebRequest -Uri http://10.0.0.17:8888/ca.crt -OutFile ca.crt
```

### 方法 3：SCP 拷贝
```bash
scp ubuntu@10.0.0.17:/home/ubuntu/.openclaw/workspace/proxy-server/certs/ca.crt .
```

## 二、安装 CA 证书

### Windows 10/11

1. **下载证书** `ca.crt`
2. **双击证书文件**
3. 点击 "安装证书"
4. 选择：
   - ☑ 当前用户（推荐）
   - 或 本地计算机（需要管理员权限）
5. 选择 "将所有证书放入下列存储"
6. 点击 "浏览"，选择 **"受信任的根证书颁发机构"**
7. 下一步 → 完成
8. 弹出安全警告，点击 "是"

**验证安装：**
```
certmgr.msc  # 打开证书管理器
→ 受信任的根证书颁发机构
→ 证书
→ 查找 "ProxySniffer CA"
```

### macOS

**方法 1：命令行（推荐）**
```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain ca.crt
```

**方法 2：图形界面**
1. 双击 `ca.crt`
2. 会自动打开 "钥匙串访问"
3. 选择 "系统" 或 "登录" 钥匙串
4. 点击 "添加"
5. 打开 "钥匙串访问" 应用
6. 左侧选择 "系统" 或 "登录"
7. 右侧找到 "ProxySniffer CA"
8. 双击证书 → 展开 "信任" → 选择 "始终信任"

### Ubuntu / Debian / Linux

**Firefox（独立证书存储）：**
1. 打开 Firefox
2. 设置 → 隐私与安全 → 证书 → 查看证书
3. 点击 "导入"
4. 选择 `ca.crt`
5. 勾选：
   - ☑ 信任此 CA 来标识网站
6. 确定

**Chrome/Chromium（系统证书）：**
```bash
# Ubuntu
sudo cp ca.crt /usr/local/share/ca-certificates/proxysniffer.crt
sudo update-ca-certificates

# 验证
ls -l /etc/ssl/certs/ | grep proxysniffer
```

**系统级（所有应用）：**
```bash
# Debian/Ubuntu
sudo apt-get install -y ca-certificates
sudo cp ca.crt /usr/local/share/ca-certificates/proxysniffer.crt
sudo update-ca-certificates

# CentOS/RHEL
sudo cp ca.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust
```

### Android

**Android 7+：**

1. 设置 → 安全 → 加密与凭据 → 安装证书 → CA 证书
2. 选择 `ca.crt`
3. 命名：`ProxySniffer CA`
4. 完成

**注意：** Android 7+ 需要 root 权限才能全局信任，或使用 `adb`：
```bash
adb root
adb push ca.crt /system/etc/security/cacerts/
adb reboot
```

**推荐：** 使用 Firefox for Android（独立证书存储，无需 root）

### iOS (iPhone/iPad)

**详细安装步骤请参考：** [IOS_SETUP.md](IOS_SETUP.md)

**快速步骤：**

1. **发送证书到设备：**
   - 通过 AirDrop
   - 邮件附件
   - 访问 http://115.159.196.184:8888/ca.crt

2. **安装描述文件：**
   - 设置 → 通用 → VPN与设备管理
   - 点击 ProxySniffer CA → 安装

3. **启用完全信任：**
   - 设置 → 通用 → 关于本机 → 证书信任设置
   - 开启 ProxySniffer CA 的完全信任
## 三、配置代理

### Windows

**IE / Chrome / Edge：**
1. 设置 → 网络和 Internet → 代理
2. 手动设置代理 → 开启
3. 地址：`10.0.0.17`
4. 端口：`8080`
5. 勾选 "对本地地址不使用代理服务器"（可选）

**Firefox（独立代理设置）：**
1. 设置 → 网络设置 → 手动配置代理
2. HTTP 代理：`10.0.0.17` 端口：`8080`
3. 勾选 "为所有协议使用相同代理"
4. 或单独设置：
   - SSL 代理：`10.0.0.17` 端口：`8080`

### macOS

**系统全局代理：**
1. 系统设置 → 网络
2. 选择网络接口（WiFi/以太网）
3. 高级 → 代理
4. 勾选：
   - ☑ 网页代理 (HTTP)
   - ☑ 安全网页代理 (HTTPS)
5. 服务器：`10.0.0.17`
6. 端口：`8080`
7. 确定 → 应用

### Linux

**环境变量（终端）：**
```bash
export http_proxy=http://10.0.0.17:8080
export https_proxy=http://10.0.0.17:8080
export ftp_proxy=http://10.0.0.17:8080
export no_proxy=localhost,127.0.0.1
```

**GNOME 桌面：**
1. 设置 → 网络 → 网络代理
2. 方法：手动
3. HTTP 代理：`10.0.0.17` 端口 `8080`
4. HTTPS 代理：`10.0.0.17` 端口 `8080`
5. 应用

### Android

1. 设置 → WiFi
2. 长按当前连接的 WiFi
3. 修改网络 → 高级选项
4. 代理：手动
5. 代理服务器：`10.0.0.17`
6. 端口：`8080`
7. 保存

### iOS

1. 设置 → WiFi
2. 点击当前 WiFi 的 ⓘ 图标
3. 配置代理 → 手动
4. 服务器：`10.0.0.17`
5. 端口：`8080`
6. 存储

### 浏览器插件（推荐）

**SwitchyOmega（Chrome/Edge/Firefox）：**
1. 安装插件
2. 新建情景模式 → 代理服务器
3. 协议：HTTP
4. 服务器：`10.0.0.17`
5. 端口：`8080`
6. 应用

## 四、验证

### 测试 HTTP
```bash
curl -v http://example.com --proxy http://10.0.0.17:8080
```

### 测试 HTTPS
```bash
curl -v https://example.com --proxy http://10.0.0.17:8080 \
  --cacert /path/to/ca.crt
```

### 查看抓包日志
```bash
# 在服务端查看
tail -f /home/ubuntu/.openclaw/workspace/proxy-server/logs/capture-$(date +%Y-%m-%d).json
```

## 五、常见问题

### ❌ 证书不受信任
- 确认 CA 证书已安装到 **受信任的根证书颁发机构**
- 重启浏览器
- 检查系统时间是否正确

### ❌ 无法连接代理
```bash
# 检查服务是否运行
netstat -tlnp | grep 8080

# 检查防火墙
sudo ufw status
sudo ufw allow 8080/tcp
```

### ❌ HTTPS 网站无法访问
- 确认客户端已安装 CA 证书
- 确认代理已设置为 **10.0.0.17:8080**
- Firefox 需要单独导入证书

### ❌ 抓不到包
- 确认客户端流量经过代理
- 检查客户端代理设置
- 查看服务端日志：`logs/capture-*.json`

## 六、卸载

### 停止服务
```bash
# 前台运行的话 Ctrl+C
# 后台运行
pkill -f "node server.js"
```

### 删除 CA 证书

**Windows：**
certmgr.msc → 受信任的根证书颁发机构 → 删除 "ProxySniffer CA"

**macOS：**
```bash
sudo security delete-certificate -c "ProxySniffer CA" \
  /Library/Keychains/System.keychain
```

**Linux：**
```bash
sudo rm /usr/local/share/ca-certificates/proxysniffer.crt
sudo update-ca-certificates
```

---

**注意：** 此工具仅用于合法授权的安全测试，请勿用于非法用途！
