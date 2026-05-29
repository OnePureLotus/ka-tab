# <img src="./ka-tab.png" alt="KaTab logo" width="40" align="left" /> KaTab

**把新标签页变成你的工作台。** KaTab 替换 Chrome 的新标签页，带来看板式工作空间——用 Collection 聚合网址、用 Note 随手记录、将打开的标签页直接拖入看板。

[English](./README.md)

---

## 概览

![KaTab 新标签页总览](./docs/screenshots/overview.png)

---

## 功能介绍

### 📁 Collection — 将网站整理成项目看板

把相关网站归入一个命名、带颜色的 Collection。

![Collection 看板](./docs/screenshots/collections-board.png)

- **一键打开** — 将 Collection 内所有网站以 Chrome 标签组方式打开，自动匹配颜色
- **颜色映射** — Collection 颜色自动映射到最接近的 Chrome 标签组颜色
- **拖拽排序** — 看板卡片支持磁吸式拖拽重排
- **网站管理** — 在卡片内添加、删除、排序网站；点击查看全部时可搜索

![Collection 卡片细节](./docs/screenshots/collection-card.png)

> 点击卡片上的 **Open all** 按钮，可选择在当前窗口（标签组）或新窗口中打开所有网站。

![打开 Collection 弹窗](./docs/screenshots/open-collection-dialog.png)

---

### 📝 Note — 随手记录，不打断阅读

**在任意网页：** 划选文字 → 点击悬浮 **KA** 按钮 → 可编辑后保存，笔记自动附带来源 URL。

![网页上的 KA 悬浮按钮](./docs/screenshots/floating-ka-button.png)

![保存到 Note 的面板](./docs/screenshots/floating-note-panel.png)

**在新标签页：** 直接在 Notes 侧边栏输入，支持 Markdown 基础语法。

![Notes 侧边栏](./docs/screenshots/notes-sidebar.png)

---

### 🗂️ Tab Tray — 标签页就在手边

左侧边栏实时显示当前打开的所有标签页和最近关闭的页面，拖拽即可收入任意 Collection。

![Tab Tray 侧边栏](./docs/screenshots/tab-tray.png)

- **当前标签页** — 实时显示当前窗口所有打开的标签页
- **最近关闭** — 最多显示 25 条关闭记录，同样支持拖入 Collection
- 点击任意条目可跳转或恢复该标签页

---

### 🔍 搜索

在顶栏搜索框中模糊搜索所有 Collection、网站和 Note。

![搜索功能](./docs/screenshots/search.png)

---

### ⚙️ 设置

配置 Collection 调色板、界面主题（亮色/暗色）以及数据备份。

![设置页面](./docs/screenshots/settings.png)

---

### ☁️ 跨设备同步

所有 Collection 和 Note 数据通过 `chrome.storage.sync` 自动同步。若两台设备同时编辑同一数据，冲突解决面板允许你手动选择保留哪个版本。

---

## 开发指南

### 环境要求

- **Node.js** ≥ 18
- **pnpm** ≥ 9

### 初始化

```bash
git clone https://github.com/your-username/ka-tab.git
cd ka-tab
pnpm install
```

### 开发模式（热更新）

```bash
pnpm dev
```

然后打开 `chrome://extensions`，开启**开发者模式**，点击**加载已解压的扩展程序**，选择 `.output/chrome-mv3-dev/` 目录。

### 生产构建

```bash
pnpm build
# 输出目录 → .output/chrome-mv3/
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动热更新开发服务器 |
| `pnpm build` | 生产构建 |
| `pnpm zip` | 构建并打包为 Chrome 应用商店 zip |
| `pnpm lint` | Biome 代码检查 |
| `pnpm check` | 检查 + 自动格式化 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm test:unit` | 单元测试（Vitest） |
| `pnpm test:integration` | 集成测试（Playwright） |
| `pnpm test:all` | 运行全部测试 |

### 目录结构

```
src/
├── entrypoints/
│   ├── newtab/          # 新标签页 — 主 UI
│   ├── content/         # 内容脚本 — 悬浮 KA 按钮与 Note 面板
│   ├── background/      # Service Worker — 消息处理
│   └── options/         # 设置页
├── features/
│   ├── collections/     # Collection 逻辑、卡片、拖拽
│   ├── notes/           # Note 面板与存储
│   └── tab-tray/        # 当前标签页 & 最近关闭
└── shared/
    ├── messaging/        # Chrome runtime 消息类型与客户端
    ├── storage/          # 存储 key 与辅助函数
    └── settings/         # 用户偏好设置
```

### 技术栈

| | |
|---|---|
| UI | [SolidJS](https://solidjs.com) |
| 扩展工具链 | [WXT](https://wxt.dev)（Chrome MV3） |
| 样式 | [UnoCSS](https://unocss.dev) |
| 拖拽 | [@thisbeyond/solid-dnd](https://github.com/thisbeyond/solid-dnd) |
| 代码规范 | [Biome](https://biomejs.dev) |
| 测试 | [Vitest](https://vitest.dev) + [Playwright](https://playwright.dev) |

---

## 许可证

MIT
