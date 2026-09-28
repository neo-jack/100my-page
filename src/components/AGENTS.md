## components

`components/` 保存展示页的 React 组件，按渲染职责分为 `canvas/`、`dom/` 和 `ui/`；组件源码以当前 `3Dpage/src/` 为准，参考项目只用于对照。

**Important:** Three.js 场景和 DOM 页面必须保持分层；不要把页面文案、路由或站点壳层逻辑塞进场景组件。

**Important:** 组件样式直接写在对应 JSX 元素的 Tailwind `className` 和 `style` 上；状态、伪元素和响应式规则用 Tailwind 表达。不要另建组件 CSS 文件，也不要把 CSS 字符串、`<style>` 标签或纯样式对象集中到文件顶部；此规则同样适用于 `dom/scroll/EngineeringScroll.tsx`、`dom/flight/FlightGestureHint.tsx` 和 `dom/home/HomePage.tsx`。

### Important files

- `dom/home/HomePage.tsx` — 首页容器，挂载 Canvas、入口门和首屏 DOM 内容；DOM 组件按物品或功能分类，细则见 `dom/AGENTS.md`。
- `canvas/` — Three.js 场景组件，细则见 `canvas/AGENTS.md`。
- `canvas/entrance/` — 按 `door/`、`wall/`、`window/`、`pet/`、`planter/`、`ground/` 分类入口物品，共用逻辑放在 `shared/`。
- `canvas/about/` — 天空、云朵、纸飞机和飞行控制。
- `canvas/portfolio/` — 漂浮作品卡片与聚焦镜头；与 `dom/portfolio/PortfolioDetails.tsx` 的纸张详情通过首页状态协作。
- `ui/SiteShell.tsx` — 顶部站点壳、背景音乐控制、移动端菜单和滚动容器。

### Implementation notes

- Canvas 子组件只能在 `<Canvas>` 内渲染；DOM 组件负责普通 HTML、布局和页面状态。
- 共享纹理、字体和音频从 `public/` 静态导入；笔记封面、图片和视频使用 `data/note/` 编译后的资源地址，均由 Vite 生成发布地址。组件布局、颜色和排版使用元素上的 Tailwind class，动态数值、复杂渐变和纹理参数就近写入元素的 `style`。
- Tailwind 4 类名优先使用 `../global.css` 的主题别名：`text-l1`、`border-l1`、`bg-l3`、`border-line`；仅未定义主题别名的变量使用 `w-(--scroll-width)`、`text-(--shell-foreground)` 等形式。可等价表达的尺寸、层级和动画时间使用数值类（如 `h-24`、`z-1`、`duration-180`）；保留无等价类的任意值，像素转间距类时核对根字号与实际显示尺寸。
- 修复 `suggestCanonicalClasses` 时加载实际 `global.css` 及其 `@theme` 映射，并复查 Tailwind 语言服务诊断；类型检查和构建通过不能证明编辑器提示已清零，不通过关闭该诊断隐藏问题。
- 无法通过元素 `style` 定义的多段关键帧动画可在组件内使用 Web Animations API；须响应 `prefers-reduced-motion`，并在卸载时取消动画、移除媒体查询监听，不把组件动画搬进 `global.css`。
- 组件职责变化时同步检查 `App.tsx`、`HomePage.tsx` 和最近层级的 `AGENTS.md`，不要仅更新父级目录图。
