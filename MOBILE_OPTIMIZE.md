### 移动端适配方案

## 需要添加的响应式样式

在 `<style>` 标签的末尾添加以下媒体查询：

```css
/* ========== 移动端适配 ========== */

/* 平板设备 (<= 1024px) */
@media (max-width: 1024px) {
    .main-container {
        flex-direction: column;
    }
    
    .request-list {
        width: 100%;
        height: 50vh;
        border-right: none;
        border-bottom: 1px solid #3e3e42;
    }
    
    .detail-panel {
        height: 50vh;
    }
    
    .toolbar {
        flex-wrap: wrap;
        gap: 8px;
    }
    
    .toolbar h1 {
        font-size: 12px;
        margin-right: 10px;
    }
    
    .search-box {
        max-width: 100%;
        order: 10;
        flex-basis: 100%;
    }
}

/* 手机设备 (<= 768px) */
@media (max-width: 768px) {
    .toolbar {
        padding: 6px 10px;
    }
    
    .toolbar h1 {
        font-size: 11px;
        margin-right: 8px;
    }
    
    .btn {
        padding: 5px 10px;
        font-size: 11px;
    }
    
    .request-list {
        height: 40vh;
    }
    
    .detail-panel {
        height: 60vh;
    }
    
    .request-item {
        padding: 8px 10px;
    }
    
    .request-item .url {
        font-size: 11px;
    }
    
    .request-item .meta {
        font-size: 10px;
    }
    
    .detail-tabs {
        padding: 0 8px;
    }
    
    .tab {
        padding: 8px 12px;
        font-size: 12px;
    }
    
    .detail-content {
        padding: 12px;
    }
    
    .section-title {
        font-size: 11px;
    }
    
    .info-table {
        font-size: 11px;
    }
    
    .info-table td {
        padding: 6px 8px;
    }
    
    .json-viewer, .code-block {
        font-size: 11px;
        padding: 10px;
    }
}

/* 小屏手机 (<= 480px) */
@media (max-width: 480px) {
    .toolbar h1 {
        display: none;
    }
    
    .btn {
        padding: 4px 8px;
        font-size: 10px;
    }
    
    .btn-curl, .btn-clear {
        font-size: 0;
    }
    
    .btn-curl::before {
        content: "📋";
        font-size: 14px;
    }
    
    .btn-clear::before {
        content: "🗑️";
        font-size: 14px;
    }
    
    .request-item .method {
        font-size: 10px;
        padding: 1px 4px;
        min-width: 40px;
    }
    
    .status-code {
        font-size: 10px;
    }
    
    .detail-tabs {
        overflow-x: auto;
        white-space: nowrap;
    }
    
    .tab {
        padding: 6px 10px;
        font-size: 11px;
    }
}
```

## 布局变化说明

### 桌面端 (> 1024px)
- 左右布局：左侧请求列表（450px），右侧详情面板
- 完整显示所有功能

### 平板端 (768px - 1024px)
- 上下布局：上方请求列表（50vh），下方详情面板（50vh）
- 搜索框占满整行

### 手机端 (480px - 768px)
- 上下布局：上方请求列表（40vh），下方详情面板（60vh）
- 按钮和文字稍小
- 内边距减小

### 小屏手机 (< 480px)
- 隐藏标题 "ProxySniffer"
- 按钮只显示图标（📋 和 🗑️）
- 标签可以横向滚动
- 进一步减小内边距和字体

## 额外优化建议

### 1. 添加触摸友好的交互
```css
/* 增大点击区域 */
.request-item {
    min-height: 44px; /* Apple 推荐的最小点击区域 */
}

.btn {
    min-height: 36px;
    min-width: 36px;
}

/* 禁用 hover 效果在触摸设备上 */
@media (hover: none) {
    .request-item:hover {
        background: transparent;
    }
    
    .request-item:active {
        background: #2a2d2e;
    }
}
```

### 2. 优化字体大小
```css
/* 防止移动端自动缩放 */
meta[name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"]
```

### 3. 添加加载状态
```css
/* 移动端加载动画 */
@media (max-width: 768px) {
    .loading::after {
        content: '';
        display: block;
        width: 20px;
        height: 20px;
        border: 2px solid #569cd6;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 20px auto;
    }
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
```

## 使用方法

将上面的 CSS 代码添加到 `proxyman-style.html` 的 `<style>` 标签末尾即可。
