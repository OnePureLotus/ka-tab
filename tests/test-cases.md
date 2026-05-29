# KaTab 测试用例完整列表

## 测试统计 (更新时间: 2026-05-27)

- **单元测试**: 95个 (vitest)
- **E2E测试**: 85个 (52个原有 + 33个新增)
- **Integration测试**: 21个 (16个原有 + 5个新增)
- **总计**: 201个测试用例

---

## E2E测试用例 (85个)

### Collections模块 (18个原有 + 13个新增 = 31个)

**原有测试 (collections.spec.ts) - 18个**:
- E2E-C-01~C-18: Collection CRUD、添加站点、搜索等基础功能

**新增测试 (collection-modal.spec.ts) - 6个**:
- E2E-CM-01: 点击collection标题打开模态框
- E2E-CM-02: 模态框显示collection的所有站点
- E2E-CM-03: 搜索输入过滤模态框内的站点
- E2E-CM-04: "Remove site"按钮删除站点
- E2E-CM-05: 关闭模态框返回board视图
- E2E-CM-06: 模态框内"+ Add site"按钮正常工作

**新增测试 (site-validation.spec.ts) - 5个**:
- E2E-SV-01~05: URL验证(无效、空、无协议、HTTP/HTTPS、重复)

**新增测试 (collection-color.spec.ts) - 5个**:
- E2E-CC-01~05: 颜色选择器(右键菜单、模态框、预设、持久化、自定义)

**新增测试 (collection-open-all.spec.ts) - 2个激活 + 2个跳过**:
- E2E-CO-03: 空collection保持"Open all"按钮禁用
- E2E-CO-04: 添加第一个站点后"Open all"立即启用

### Notes模块 (11个原有 + 8个新增 = 19个)

**原有测试 (notes.spec.ts) - 11个**:
- E2E-N-01~N-11: Notes CRUD、markdown粗体、删除、快捷键

**新增测试 (notes-markdown.spec.ts) - 8个**:
- E2E-NM-01: 斜体渲染
- E2E-NM-02: 链接渲染
- E2E-NM-03: 代码块渲染
- E2E-NM-04: 列表渲染
- E2E-NM-05: 标题渲染
- E2E-NM-06: 混合markdown
- E2E-NM-07: 删除线渲染
- E2E-NM-08: 引用块渲染

### Settings模块 (18个原有 + 6个新增 = 24个)

**原有测试 (settings.spec.ts) - 18个**:
- E2E-SE-01~SE-18: 主题、颜色、blocked domains、数据备份UI

**新增测试 (settings-backup.spec.ts) - 6个**:
- E2E-SB-01: "Export Backup"下载JSON文件
- E2E-SB-02: 导出的JSON包含collections和notes
- E2E-SB-03: "Import Backup"按钮接受JSON文件
- E2E-SB-04: 有效备份文件正确恢复数据
- E2E-SB-05: 无效JSON文件显示错误消息
- E2E-SB-06: 导入时有已存在数据显示确认

### Tab Tray模块 (5个原有 + 1个新增 = 6个)

**原有测试 (tab-tray.spec.ts) - 5个**:
- E2E-TT-01~TT-05: Tab Tray UI、骨架加载、部分切换

**新增测试 (tab-tray-drag.spec.ts) - 1个激活 + 4个跳过**:
- E2E-TD-05: 页面加载时tab tray面板可见

---

## Integration测试用例 (21个)

### Collection Lifecycle (5个原有)
- IT-C-01~05: 重命名、添加站点、删除collection等多步骤流程

### Collection Modal Workflows (3个新增)
- IT-CM-01: 打开模态框→删除站点→关闭→重新打开→站点已删除
- IT-CM-02: 搜索站点→清除搜索→所有站点返回
- IT-CM-03: 模态框内添加站点→reload→站点持久化

### Collection Color (2个新增)
- IT-CC-01: 创建collection→更改颜色→reload→颜色持久化
- IT-CC-02: 更改多个collection颜色→所有颜色都持久化

### First-Time User Flow (5个原有)
- IT-FT-01~05: 首次用户完整onboarding流程

### Notes Lifecycle (3个激活 + 2个跳过)
- IT-N-01,02,05: 笔记创建、多笔记、快捷键持久化

### Settings Effects (3个激活 + 4个注释)
- IT-SE-01,05,06: 主题、settings不影响已有数据

---

## 单元测试 (95个)

位于 `src/**/*.test.ts`，覆盖工具函数、service逻辑等。

---

## 运行测试

```bash
# 所有测试
pnpm test:all

# 单元测试
pnpm test:unit

# E2E测试
pnpm test:e2e

# Integration测试
pnpm test:integration

# UI模式
pnpm exec playwright test --ui
```

---

## 测试覆盖总结

### ✅ 已全面覆盖
- Collection CRUD + CollectionModal操作
- Site URL验证
- Collection颜色选择和持久化
- Notes markdown全功能(8种语法)
- Settings数据备份导入
- 数据持久化验证

### ⚠️ 部分覆盖
- Collection "Open All"(UI状态，未测试实际打开)
- Tab Tray拖放(基础UI，未测试拖放操作)

### ❌ 待补充
- Floating Panel content script
- 错误处理场景
- 性能和可访问性测试
