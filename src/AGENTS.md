## src

`src/` 保存展示页的 React 入口、全局样式和组件源码；项目运行与构建规则见 `../AGENTS.md`，各子目录按其最近层级的 `AGENTS.md` 维护。

**Important:** `global.css` 只保留全局基础层；组件布局、排版和响应式样式优先写在对应组件的 Tailwind className 中。

### Important files

- `App.tsx` — React 挂载入口，通过 `./global.css` 加载全局样式。
- `../index.html` — 内联轻量启动模块，调用 `utils/startup.ts` 后动态导入 `App.tsx` 并捕获主包加载失败。
- `global.css` — Tailwind 入口、字体、主题变量、Tailwind 主题别名和基础 reset。
- `components/`、`context/`、`shaders/`、`utils/` — 分别维护组件、音效 Context、自定义材质和工具，细则见各目录说明。
- `../build/` 保存仅供 Node.js 使用的构建插件、资源审计和回归测试；`src/utils/` 只保留浏览器工具，浏览器模块不得导入 `build/`。
- `../public/` — 构建导入的媒体源文件；当前图片基线位于 `../build/assetBaseline.json`，浏览器不导入构建清单或维护文档。
- `data/note/` — 3D 卡片、卷轴和 DOM 详情共用的 Markdown 笔记、作品信息与可选媒体附件，细则见该目录说明。

### Implementation notes

- 字体通过 `@font-face` 的 `../public/fonts/` 相对路径交给 Vite 处理，组件中的字体、音效和纹理使用静态 `?url` 导入。
- 全局颜色变量定义在 `:root`；`@theme inline` 中的 `l1`、`l2`、`line`、`b1` 等别名供 Tailwind 类使用。
- 修改 CSS 时优先对照已有设计证据和运行截图，不要把一次性调试颜色写成长期 token，也不要把页面专属规则写回全局样式。
- 移动全局样式时同步更新 `App.tsx` 的导入及相关目录说明，并在项目根目录运行 `npm run build` 验证。
- 加载画面的关键样式内联于 `../index.html`，以便应用 CSS 下载前显示；这是首屏启动样式的特例，不放进 `global.css`。`App.tsx` 的 `onUncaughtError` 将初始化错误交给启动加载层。
- Vite 构建会替换入口 script 标签，启动脚本下载失败由 HTML 内联捕获监听处理，不能仅依赖入口标签上的 `onerror` 属性。
