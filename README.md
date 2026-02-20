[English](./README-EN.md) | **中文**

# Eye Protection 护眼浏览器扩展

一款功能全面的护眼浏览器扩展，基于 WXT + React + TypeScript 构建，提供色温滤镜和休息提醒两大核心功能。

## ✨ 功能特性

### 🌅 色温滤镜
- 全屏暖色覆盖层，减少蓝光辐射
- 可调节强度 (0-100)
- 保护眼睛，改善睡眠质量

### ⏰ 休息提醒
- 定时提醒休息，保护视力
- 可设置提醒间隔（默认 20 分钟）
- 全屏提醒遮罩，20 秒倒计时
- 支持跳过提醒

### 📅 定时计划
- 自动在指定时间开启/关闭色温滤镜
- 支持跨午夜时间范围（如 22:00 → 07:00）
- 每分钟检查当前时间

## 🛠️ 技术栈

- **框架**: [WXT](https://wxt.dev/) - 现代化浏览器扩展开发框架
- **UI**: React 19 + TypeScript
- **样式**: 纯 CSS（CSS 变量 + 自定义组件）
- **包管理**: pnpm

## 📦 安装与开发

### 环境要求

- Node.js 18+
- pnpm 8+

### 开发模式

```bash
# 安装依赖
pnpm install

# 启动开发服务器 (Chrome)
pnpm dev

# 启动开发服务器 (Firefox)
pnpm dev:firefox
```

### 构建生产版本

```bash
# 构建 Chrome 扩展
pnpm build

# 构建 Firefox 扩展
pnpm build:firefox

# 打包为 .zip 文件
pnpm zip
pnpm zip:firefox
```

## 🏗️ 项目结构

```
eye-protection/
├── entrypoints/
│   ├── background.ts      # 后台脚本：状态管理、定时器、消息中心
│   ├── content.ts         # 内容脚本入口
│   ├── content/
│   │   ├── break-reminder.ts  # 休息提醒功能
│   │   └── color-temp.ts      # 色温滤镜功能
│   ├── popup/             # 弹窗 UI
│   │   ├── App.tsx        # 主组件
│   │   ├── components/    # UI 组件
│   │   └── style.css      # 样式
│   └── shared/
│       ├── storage.ts     # 存储封装
│       └── types.ts       # 类型定义
├── public/icon/           # 扩展图标
├── docs/plans/            # 设计文档
└── wxt.config.ts          # WXT 配置
```

## 🔧 架构设计

```
Background Script (状态管理、定时器、消息中心)
        ↕ chrome.runtime.sendMessage
Popup (React UI — 设置面板)
        ↕ storage.local
Content Script (视觉效果注入)
```

### 数据流

1. 用户在 Popup 调整设置 → 写入 `storage.local` → 发送消息到 background
2. Background 转发到所有标签页的 content script
3. Content script 应用/移除视觉效果
4. 定时任务：background 注册 `chrome.alarms`，自动更新存储并通知 content script

## 📝 存储结构

```typescript
interface Settings {
  colorTemp: { enabled: boolean; intensity: number }       // intensity: 0-100
  breakReminder: { enabled: boolean; intervalMin: number } // default: 20
  schedule: { enabled: boolean; startTime: string; endTime: string } // "22:00" "07:00"
}
```

## 📄 许可证

MIT License
