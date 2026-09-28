## dom

`dom/` 保存普通 HTML 组件，按首页、宠物、卷轴、简介板、作品详情、飞行提示和加载画面分类；`home/HomePage.tsx` 组合页面，`shared/` 保存跨分类共用的纸张详情。

**Important:** DOM 层与 Canvas 层职责分离；文字层不能阻断入口门的点击，Canvas 场景也不应承载页面布局或路由文案。

### Important files

- `home/` — 首页；职责与交互规则见 `home/AGENTS.md`。
- `scroll/` — 保留的工程卷轴组件，当前首页不挂载；组件内部规则见 `scroll/AGENTS.md`。
- `board/` — 简介板；职责与交互规则见 `board/AGENTS.md`。
- `portfolio/` — 作品详情；职责与交互规则见 `portfolio/AGENTS.md`。
- `flight/` — 飞行提示；职责与交互规则见 `flight/AGENTS.md`。
- `loading/` — 首屏加载；职责与交互规则见 `loading/AGENTS.md`。
- `shared/` — DOM 共用详情；职责与交互规则见 `shared/AGENTS.md`。

### Implementation notes

- 同一物品或功能的 DOM 组件放在同一目录；首页只协调挂载和跨组件状态，共用 dialog 放在 `shared/`，不复制到各分类。
- 样式遵守 `../AGENTS.md`：直接维护 JSX 的 Tailwind className 和就近 style，不新增组件 CSS 文件或集中样式字符串。
- AI 会话规则见 已安装宠物包的说明，首屏与返回主页规则见 `home/AGENTS.md`，加载就绪规则见 `loading/AGENTS.md`。
- 类型检查与构建沿用项目根 `AGENTS.md`；交互验证按各分类说明执行。
- AI 宠物与客户端工具由版本化 @my-page/ai-pet 包维护；本项目保留消费端协议测试，服务地址见 src/data/integrations.ts，不导入后端源码。
