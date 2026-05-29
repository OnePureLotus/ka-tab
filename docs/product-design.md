# 产品设计文档 — KaTab

## 概述 Overview

- **产品名称**: KaTab
- **一句话描述**: 用看板式 Collections 和智能笔记剪贴板，打造你专属的 Chrome 新标签页。
- **目标用户**: 知识工作者、研究人员、重度多标签用户——日常需要在多个项目/主题之间频繁切换浏览器标签的人。
- **核心价值**: 原生新标签页只是一个空白入口；KaTab 将其变成个人工作中枢——用 Collection 卡片聚合项目网址，用 Note 剪贴板随手记录，用 Tab Tray 随时把当前标签页拖入收藏，所有数据跨设备同步。

---

## 目标与成功指标 Goals & Success Metrics

### 产品目标
1. 用户每次打开新标签页都能立刻看到自己最关心的内容（Collections + Notes）。
2. 从"想打开某组网站"到"所有标签页已就位"，操作步骤 ≤ 2 步。
3. 网页浏览过程中遇到有价值的内容，能在不离开当前页的情况下保存到 Note。

### 成功指标（可衡量）
| 指标 | 目标值 |
|------|--------|
| 新标签页加载时间 | < 300ms |
| 首次使用完成第一个 Collection 创建 | < 2 分钟 |
| 用户 7 日留存率 | ≥ 60% |
| 平均每用户 Collection 数 | ≥ 3 个（说明产品真正被使用） |
| 跨设备同步成功率 | ≥ 99.5% |

---

## 用户故事 User Stories

> 作为**研究人员**，我希望把同一课题的所有参考网址放进一个 Collection，以便一键打开所有标签页，立刻进入工作状态。

> 作为**多项目管理者**，我希望每个 Collection 有独特颜色，以便打开后 Chrome 标签栏清晰显示不同项目的分组，不再混乱。

> 作为**内容收集者**，我希望在任意网页上划选文字后一键保存到 Note 剪贴板，以便不打断阅读节奏地积累素材。

> 作为**思考者**，我希望在新标签页上随手写便签，以便把脑中的临时想法快速落纸。

> 作为**多设备用户**，我希望 Collections 和 Notes 自动同步到我所有登录 Chrome 的设备，以便在家和公司无缝切换；当两台设备同时编辑同一数据产生冲突时，我希望能手动选择保留哪个版本。

> 作为**重度多标签用户**，我希望在新标签页右侧看到当前打开的所有标签页和最近关闭的页面，以便随时把它们拖入 Collection 永久收藏，而不必手动复制粘贴 URL。

> 作为**重度多标签用户**，我希望在新标签页右侧看到当前打开的所有标签页和最近关闭的页面，以便随时把它们拖入 Collection 永久收藏，而不必手动复制粘贴 URL。

---

## 功能列表 Features

### 核心功能（MVP）

| # | 功能 | 描述 | 优先级 |
|---|------|------|--------|
| 1 | 新标签页替换 | 安装后所有新标签页展示 KaTab 界面 | P0 |
| 2 | Collection 卡片看板 | 新标签页以卡片形式展示所有 Collections，支持拖拽排序与磁吸对齐 | P0 |
| 3 | Collection CRUD | 创建、重命名、删除 Collection；设置颜色（从 Settings 中预设的调色板选择，不允许自定义颜色输入；颜色映射到 Chrome Tab Group 标准色） | P0 |
| 4 | Collection 添加网站 | 在 Collection 卡片内添加 URL（手动输入 或 "Use current tab" — 自动填入当前活跃的浏览器标签页，跳过扩展页）；显示网站 Favicon + 标题；每个 Collection 软上限 30 个网站，达到 25 个时显示提示 | P0 |
| 5 | Collection 内网站管理 | 删除单个网站；拖拽调整网站在卡片内的顺序；点击"查看全部"打开独立 Modal（含内置搜索框，支持模糊匹配网站标题/URL） | P0 |
| 6 | 一键打开 Collection | 点击卡片上的"打开"按钮，弹出选择：① 在当前窗口新开所有标签页（自动创建同色 Chrome Tab Group）② 在新窗口打开 | P0 |
| 7 | Chrome Tab Group 颜色映射 | Collection 颜色自动映射到最接近的 Chrome Tab Group 颜色（Chrome 支持 9 种标准色） | P0 |
| 8 | Note 剪贴板 — 手动便签 | 新标签页右侧边栏，支持创建多条文本便签；支持 Markdown 基础语法 | P0 |
| 9 | Note 剪贴板 — 网页划选保存 | 在任意网页划选文字后，出现悬浮 KA 按钮；点击弹出迷你面板，面板含可编辑文本区（预填选中内容）、来源域名标注、Save / Cancel 按钮；确认后文字 + 来源 URL 保存到 Note，不需要选择 Collection | P0 |
| 10 | ~~Note 关联 Collection~~ | ~~已移除：该功能已删除~~ | ~~P0~~ |
| 11 | 跨设备同步 + 冲突解决 | 所有数据（Collections + Notes）通过 `chrome.storage.sync` 同步；检测到冲突时弹出对比界面，用户手动选择保留本地版或远端版（Collections 和 Notes 均适用） | P0 |
| 12 | Tab Tray — 当前标签页 | 新标签页最右侧边栏，实时显示当前窗口所有打开的标签页（Favicon + 标题），可拖入任意 Collection | P0 |
| 13 | Tab Tray — 最近关闭标签页 | 同上，展示最近关闭的标签页记录（调用 `history` + `sessions` API），同样支持拖入 Collection | P0 |

### 扩展功能（后续迭代）

| # | 功能 | 描述 | 优先级 |
|---|------|------|--------|
| 14 | Collection 快速搜索 | 在新标签页顶部搜索框，模糊匹配 Collection 名称 / 网站标题 | P1 |
| 15 | Note 全文搜索 | 在 Note 区搜索所有便签内容 | P1 |
| 16 | Collection 导入/导出 | 导出为 JSON 文件备份；支持从 Chrome 书签文件夹导入 | P1 |
| 17 | 右键菜单 — 保存到 Collection | 在任意网页右键 → "保存到 KaTab Collection"，选择目标 Collection | P1 |
| 18 | Note 标签分类 | 给便签打 Tag，按 Tag 筛选 | P2 |
| 19 | AI 集成 — Collection 摘要 | 调用本地 LLM（Ollama）或云端 API，对 Collection 内所有网站生成摘要 | P2 |
| 20 | AI 集成 — Note 智能整理 | AI 对多条 Note 做归纳、提炼关键词、自动打 Tag | P2 |
| 21 | AI 集成 — 自然语言搜索 | 输入自然语言，AI 匹配最相关的 Collection 或 Note | P2 |
| 22 | 统计看板 | 展示每个 Collection 的打开频率、最后访问时间 | P3 |

---

## 用户流程 User Flows

**流程 1: 首次安装 & 创建第一个 Collection**
1. 用户安装插件，打开新标签页。
2. 看到空状态引导界面："还没有 Collection，点击 ＋ 开始"。
3. 用户点击 ＋ 按钮，弹出创建面板：输入名称、选择颜色。
4. 确认后，新卡片出现在看板上。
5. 用户点击卡片内"添加网站"，选择"添加当前标签页"或手动输入 URL。
6. 网站以 Favicon + 标题形式显示在卡片内。

---

**流程 2: 一键打开 Collection**
1. 用户在新标签页看到目标 Collection 卡片。
2. 用户点击卡片上的 **▶ 打开** 按钮。
3. 若网站数量 > 20，先弹出二次确认："将打开 X 个标签页，继续？"
4. 弹出二选一 Modal：
   - 「在此窗口打开（Tab Group）」— 自动映射 Collection 颜色到最近邻 Chrome Tab Group 颜色
   - 「在新窗口打开」
5. 用户选择后，插件批量打开所有网站，自动创建对应颜色的 Chrome Tab Group（选项①）或新窗口（选项②）。
6. 用户无感知地进入工作状态。

---

**流程 3: 网页划选文字保存到 Note**
1. 用户在任意网页阅读，划选一段文字。
2. 选中文字旁出现悬浮小图标（KA 按钮）。
3. 用户点击图标，弹出迷你面板：
   - 顶部显示来源域名（如 `example.com · selected text`）
   - 可编辑文本区（预填选中文字，用户可修改）
   - Cancel / Save note 两个按钮
4. 点击「Save note」，当前文本区内容 + 来源 URL 保存到 Note；保存成功后按钮变绿（✓ Saved），面板自动关闭。
5. 面板消失，用户继续阅读，无打断感。
6. 用户打开新标签页，在 Note 区看到刚保存的条目（含来源域名）。

---

**流程 4: 手动写便签**
1. 用户打开新标签页，在 Note 区点击「＋ 新建便签」。
2. 输入文字（支持 Markdown），按 `Ctrl/Cmd + Enter` 保存，或点击空白处失焦保存。
3. 便签以卡片形式显示在 Note 区，显示时间戳和来源（若为网页保存则显示域名）。

---

**流程 6: 同步冲突解决**
1. 用户在设备 A 修改了某个 Collection，同一时间设备 B 也修改了同一 Collection。
2. 两台设备同步时，检测到版本冲突（通过时间戳 + hash 比对）。
3. 弹出冲突解决面板，并排展示两个版本的差异（Collection 名称、网站列表变化）。
4. 用户选择「保留本设备版本」或「使用另一设备版本」。
5. 确认后同步完成，两设备数据一致。

---

**流程 7: 拖拽整理 Collection 卡片**
1. 用户按住 Collection 卡片标题区域拖动。
2. 其他卡片实时让位，显示放置占位线。
3. 松手后，卡片磁吸到最近的网格位置，顺序持久化保存。

---

**流程 8: 从 Tab Tray 拖入 Collection**
1. 用户打开新标签页，在右侧 Tab Tray 看到当前打开的标签页列表。
2. 用户在"最近关闭"分组中找到刚才不小心关掉的页面。
3. 用户拖拽该 item 到左侧目标 Collection 卡片上。
4. Collection 卡片边框高亮（接受态），松手后网站添加到 Collection。
5. Tab Tray 中的 item 仍保留（可多次添加到不同 Collection）；右下角出现 Toast "已添加到 项目A"。

---

## UI/UX 设计规范 UI/UX Spec

### 入口形式

| 界面类型 | 使用场景 | 原因 |
|----------|----------|------|
| **新标签页（chrome_url_overrides: newtab）** | 主工作界面，Collections + Notes | 这是产品核心，需要充分的屏幕空间呈现看板 |
| **Content Script（悬浮按钮）** | 网页划选文字保存到 Note | 不打断用户当前页面，轻量注入 |
| **右键菜单（Context Menu）** | 保存当前页到 Collection（P1） | 系统级入口，无需额外 UI |
| **Options Page** | AI API 配置、数据导入导出、主题设置 | 低频但重要的设置项，独立页面避免污染主界面 |

> ❌ **不使用 Popup**：主要工作流都在新标签页完成，Popup 空间有限不适合看板布局。

---

### 新标签页界面结构

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  K KaTab  │  [/ Search collections, sites, notes...]  │  System:Light  │  Settings    │  ← 顶栏（固定，64px）
├───────────┼────────────────────────────────────────────────────────────┼───────────────┤
│           │                                                            │               │
│ Tab Tray  │  Collections                          6 collections ↗     │  Notes    [+] │
│(左侧边栏) │  Drop tabs from the left tray into project boards.        │  (右侧边栏)   │
│           │                                                            │               │
│ Drag to   │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐  │ [Capture idea │
│ card      │  │● Research-LLM ⋯│ │● Product Sprint⋯│ │● Design Ref⋯│  │  or paste...] │
│           │  │ OpenAI Docs     │ │ Linear Roadmap  │ │ Material 3  │  │ [No coll][Save│
│> Current  │  │ arXiv Search    │ │ Figma KaTab     │ │ SDS Comps   │  │               │
│  tabs (5) │  │ Papers w/ Code  │ │ Chrome Ext API  │ │ New Tab Pat │  │ ┌───────────┐ │
│ favicon   │  │ Semantic Scholar │ │ Release Check   │ │ A11y Check  │  │ │ note text │ │
│  Tab title│  │ +4 more (8/30)  │ │ +1 more (5/30)  │ │ +6 more... │  │ │ 2 min ago │ │
│  domain   │  │ 2 linked notes  │ │ 2 linked notes  │ │ 1 linked.. │  │ │[Research] │ │
│ ...       │  │ [+Add site][▶All│ │ [+Add site][▶All│ │[+Add][▶All]│  │ └───────────┘ │
│           │  └─────────────────┘ └─────────────────┘ └─────────────┘  │               │
│v Recently │                                                            │ ┌───────────┐ │
│  closed   │  ┌─────────────────┐ ┌──────────────────────────────────┐  │ │ note text │ │
│  (12)     │  │● Daily Ops    ⋯│ │                                  │  │ │ 1 hr ago  │ │
│ favicon   │  │ Gmail           │ │           [+]                    │  │ │ [Product] │ │
│  Tab title│  │ Calendar        │ │      Create Collection           │  │ └───────────┘ │
│  domain   │  │ Analytics       │ │  Pick a color, then drag         │  │               │
│ ...       │  │ Status Page     │ │  tabs into it.                   │  │ ┌───────────┐ │
│           │  │                 │ │                                  │  │ │ note text │ │
│           │  │[+Add site][▶All]│ └──────────────────────────────────┘  │ │ Yesterday │ │
│           │  └─────────────────┘                                       │ └───────────┘ │
│           │                                                            │               │
└───────────┴────────────────────────────────────────────────────────────┴───────────────┘
                                                         ┌────────────────────────┐
                                                         │ Added to Research - LLM │  ← Toast 通知
                                                         └────────────────────────┘
```

**布局说明**：
- **顶栏**：左侧 KaTab Logo（K 图标 + 文字），中间搜索框（占大部分宽度，placeholder "Search collections, sites, notes..."），右侧 System:Light 主题切换 + Settings 按钮；高度 64px，底部有分隔线。
- **左侧边栏（Tab Tray）**：固定宽度 ~160px；顶部标题"Tab Tray"+ "Drag to card"提示；分两个可折叠分组："Current tabs (N)"和"Recently closed (N)"；每条 item 显示 favicon + 标签页标题 + 域名，支持拖拽到 Collection 卡片。
- **中央主区（Collections 看板）**：占剩余宽度；顶部标题行"Collections"+ 副标题 + 右侧"N collections"角标；卡片以响应式网格排列（1440px 时约 3 列）；末尾卡片为"Create Collection"空状态占位卡片。
- **右侧边栏（Notes）**：固定宽度 ~200px；顶部"Notes"标题 + "+"新建按钮；顶部有 Capture 输入框（可粘贴/手动输入）+ Save 按钮；下方滚动列表展示已保存的 Note 卡片（内容 + 时间 + Collection 标签）。
- **Toast 通知**：保存/操作成功后在底部中央弹出黑色 toast（如"Added to Research - LLM"），自动消失。

---

### Collection 卡片结构

```
┌────────────────────────────────────┐
│ ● 项目名称                      ⋯  │  ← 卡片头：彩色圆点 + 名称 + 更多菜单
│────────────────────────────────────│
│ favicon  网站标题 1                │
│ favicon  网站标题 2                │
│ favicon  网站标题 3                │
│ favicon  网站标题 4                │
│ + N more (X/30)   N linked notes  │  ← 超出时折叠，右侧显示 note 数量
│────────────────────────────────────│
│ [+ Add site]          [Open all ▶] │  ← 底部操作栏
└────────────────────────────────────┘
```

- 卡片头部：左侧彩色实心圆点（对应 Collection 颜色），右侧 `⋯` 更多菜单。
- `⋯` 菜单展开项：Rename / Change color / Delete。
- 网站列表每行：favicon + 网站标题，最多显示 4 条，超出折叠为"+ N more (已用/30)"。
- 折叠行右侧显示"N linked notes"表示关联便签数量。
- 网站数量达到 25 个时显示黄色提示。
- 底部：`+ Add site`（左）+ `Open all`（右，紫色填充按钮）。
- 空状态占位卡片：居中显示 `[+]` 圆形按钮 + "Create Collection" + 副文案"Pick a color, then drag tabs into it."。

---

### Collection 详情 Modal（点击"查看全部"触发）

```
┌──────────────────────────────────────────────────────┐
│  🔵 项目A（8 个网站）                         [✕ 关闭] │
│  [🔍 搜索此 Collection 中的网站...]                    │
│──────────────────────────────────────────────────────│
│  🌐 网站标题 1          example.com    [🗑] [⠿ 拖排]  │
│  🌐 网站标题 2          foo.com        [🗑] [⠿ 拖排]  │
│  🌐 网站标题 3          bar.com        [🗑] [⠿ 拖排]  │
│  ...（全部网站，可滚动）                               │
│──────────────────────────────────────────────────────│
│  📎 关联笔记（3 条）                                  │
│  ✏️ 便签内容预览...      2分钟前                      │
│  📎 划选来源 foo.com    1小时前                       │
│──────────────────────────────────────────────────────│
│  [＋ 添加网站]                    [▶ 打开全部]        │
└──────────────────────────────────────────────────────┘
```

---

### Tab Tray 规范

- **数据来源**：
  - 当前打开：`chrome.tabs.query({ currentWindow: true })`，监听 `tabs.onCreated / onRemoved / onUpdated` 实时刷新。
  - 最近关闭：`chrome.sessions.getRecentlyClosed()`，最多显示 25 条。
- **Item 结构**：Favicon（18px，优先使用浏览器提供的 `favIconUrl`，加载失败时降级为字母头像）+ 标题（截断 + tooltip）+ 域名（小字灰色）。
- **交互**：
  - 点击 item → 跳转到该标签页（当前打开）或重新打开（最近关闭）。
  - 拖拽 item 到 Collection 卡片 → 添加到该 Collection（卡片高亮接受态）。
  - 拖拽 item 到看板空白区域 → 无效，item 回弹。
- **拖拽视觉**：item 被拖出时变为"幽灵卡片"（半透明），Collection 卡片进入高亮悬停状态（边框发光）；松手后显示 Toast "已添加到 [Collection 名称]"。
- **"最近关闭"分组**：默认折叠，点击展开；显示关闭时间（"2 分钟前"）。

---



```
┌──────────────────────────────────┐
│  打开「项目A」                    │
│  共 8 个网站                      │
│                                  │
│  ┌──────────────────────────┐    │
│  │  在此窗口打开             │    │
│  │  自动创建蓝色标签组        │    │
│  └──────────────────────────┘    │
│                                  │
│  ┌──────────────────────────┐    │
│  │  在新窗口打开             │    │
│  └──────────────────────────┘    │
│                                  │
│  [取消]                          │
└──────────────────────────────────┘
```

---

### 状态设计

| 状态 | Collection 区 | Note 区 | Tab Tray |
|------|--------------|---------|----------|
| **空状态（首次使用）** | 居中插画 + "创建你的第一个 Collection" CTA 按钮 | "还没有便签，划选网页文字或点击＋开始记录" | 显示当前打开标签页；"最近关闭"为空时隐藏该分组 |
| **加载中** | 卡片骨架屏（Skeleton），避免布局抖动 | 同左 | 骨架屏条目 |
| **同步中** | 顶栏右侧显示旋转同步图标 | — | — |
| **同步冲突** | 顶栏显示 ⚠️ "检测到冲突，点击解决"，点击打开并排对比面板 | 同左（Note 冲突也触发相同机制） | — |
| **打开 Collection 失败**（网络/权限） | Toast 提示"部分网站无法打开" | — | — |
| **Tab Tray 拖拽悬停** | Collection 卡片边框高亮（蓝色发光），显示"松开即可添加" | — | 被拖拽 item 呈幽灵态 |

---

### 拖拽交互规范

- **拖拽对象**：Collection 卡片整体（拖拽区域为卡片头部）；卡片内部网站列表条目也支持拖拽排序。
- **磁吸规则**：释放时自动吸附到最近的网格槽位（8px 网格基准），不允许自由浮动。
- **视觉反馈**：被拖拽的卡片半透明（opacity 0.7）+ 轻微放大（scale 1.03）；目标位置显示虚线占位框。
- **动画**：其他卡片位移动画 150ms ease-out。

---

### Content Script 悬浮按钮规范

- **触发**：用户在页面上 `mouseup` 后，若 `window.getSelection()` 有内容，则在选区右下角 +12px 处显示。
- **外观**：24×24px 圆形按钮，KaTab Logo，带轻阴影。
- **消失时机**：点击按钮后、点击页面其他区域后、`mousedown` 时。
- **保存成功反馈**：按钮变为 ✓ 图标，0.8s 后消失。
- **屏蔽域名**：Options 页面可添加不显示按钮的域名黑名单。

---

## 技术约束与权限 Technical Constraints & Permissions

| 权限 | 用途 | 必要性 |
|------|------|--------|
| `storage` | 存储 Collections、Notes 数据；`sync` 用于跨设备同步 | **必须** |
| `tabs` | 批量打开标签页、读取当前标签页列表（Tab Tray） | **必须** |
| `tabGroups` | 创建并设置 Chrome Tab Group 颜色 | **必须** |
| `sessions` | 读取最近关闭的标签页（Tab Tray "最近关闭"分组） | **必须** |
| `history` | 辅助获取最近关闭页面的标题/Favicon（sessions API 数据不完整时补充） | **必须** |
| `contextMenus` | 右键菜单"保存到 Collection"（P1 功能） | 可选（P1） |
| `scripting` | 注入 Content Script（划选保存按钮） | **必须** |
| `host_permissions: <all_urls>` | Content Script 需在所有页面注入 | **必须**（需在 Store 说明中解释用途以通过审核） |

- **Manifest 版本**: Manifest V3
- **最低 Chrome 版本**: Chrome 102（`tabGroups` API 在此版本稳定）
- **是否需要后端服务**: MVP 阶段不需要。AI 集成阶段可选——若使用云端 API，需要后端做密钥代理；若接本地 Ollama，直接从插件调用 `localhost`，无需后端。
- **颜色映射规则**: Collection 自定义颜色（HEX）在存储时自动计算与 Chrome 9 种标准 Tab Group 颜色（grey/blue/red/yellow/green/pink/purple/cyan/orange）的 CIELAB 色差，取最小值映射；映射结果在卡片 UI 中以小标注提示用户实际渲染色。
- **存储限制说明**:
  - `chrome.storage.sync` 上限：总量 102KB，单 key 8KB
  - 每个 Collection 使用独立 key，单 Collection 软上限 30 条网站（约 6KB/key，留有余量）
  - 若总量超限，降级到 `chrome.storage.local`（无限制），并在 UI 中提示"数据较多，已切换为本地存储，跨设备同步暂停"
- **冲突检测机制**: 每条数据附带 `updatedAt` 时间戳 + 内容 hash；同步时若远端 hash 与本地不同且时间戳均晚于上次同步时间，则判定为冲突。

---

## 非功能需求 Non-Functional Requirements

- **性能**：新标签页首屏渲染 < 300ms（从导航到 LCP）；Collection 打开操作响应 < 100ms（不含网页加载时间）。
- **隐私**：所有数据仅存储在用户本地设备及其 Chrome 账号的加密同步空间，不上传任何第三方服务器（AI 功能为可选且用户主动配置）。Store 隐私政策需明确说明。
- **无障碍（Accessibility）**：
  - 所有交互元素有 `aria-label`。
  - 颜色标识同时提供图案/文字辅助（不仅依赖颜色区分 Collection）。
  - 支持键盘完整操作（Tab 导航、Enter/Space 激活、Escape 关闭 Modal）。
- **主题**：跟随系统 Dark / Light Mode 自动切换。

---

## 范围边界 Scope Boundaries

**包含 (In scope)**:
- 新标签页替换为三栏看板界面（Collections / Notes / Tab Tray）
- Collections 完整 CRUD + 颜色 + 一键打开（Tab Group / 新窗口）
- Collection 内网站管理（增删、拖排、独立 Modal + 搜索）
- Note 剪贴板（手动 + 网页划选保存，保存时附带来源 URL）
- Tab Tray（当前标签页 + 最近关闭，可拖入 Collection）
- 数据跨设备同步（chrome.storage.sync），Collections 和 Notes 均有冲突解决
- 拖拽磁吸看板布局

**不包含 (Out of scope)**:
- 浏览历史分析（不申请 `history` 权限）
- 标签页实时监控 / 自动分组
- 移动端 / Safari / Firefox 支持
- 团队协作 / 共享 Collection
- AI 功能（列为 P2，单独迭代规划）
- 网页截图 / 全文保存（Note 仅保存文本）
- 内置浏览器或 iframe 预览

---

## 开放问题 Open Questions

1. **Tab Tray 的历史记录深度**：`sessions` API 默认返回 25 条最近关闭记录。是否需要允许用户在 Options 中调整这个数量上限？
2. **`history` 权限的 Store 审核**：`history` 是敏感权限，Chrome Web Store 审核较严格，需要在 Store 描述中清晰说明仅用于显示最近关闭页面的标题，不做任何分析或上传。

---

*文档版本: v0.3 · 2026-05-21 · 所有核心设计决策已确认，可进入开发*
