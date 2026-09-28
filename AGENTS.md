## 100my-3dpage

独立 React / Three.js / Vite 主页 Git 仓库。源码位于本仓库根目录；AI 宠物通过版本化 npm tarball 安装，其他服务只通过配置地址接入。

**Important:** 不得跨目录导入 104my-ai、监控、Codeground 或 2D 源码；所有依赖由本仓库锁文件与 vendor 保证。原历史已按子目录提取，旧父仓库元数据在 ../.archive。

### Important files

- `README.md` — GitHub 项目入口，沿用 miniReact 的简洁结构：项目简介、在线体验、快速开始、构建与验证；标题使用 GitHub 仓库名，只保留必要接入配置，不混入本机目录编号、迁移记录或提交历史说明。

- `package.json` — 依赖、Vite 脚本和运行时入口。
- `index.html` — 包含内联纸张加载画面的 HTML 壳和 `#root` 挂载点，在主包下载前即可绘制；双圆环半径 44.6/34.8、周期 10.4/4.2 秒，左右纸张中的 SVG 保持一致；加载失败不展示提示文案或重试按钮。 同时静态声明 `/public/icon.svg`，由 Vite 重写为哈希地址并供 `App.tsx` 复用，避免主包执行前请求缺失的 `/favicon.ico`。
- `index.html` 底部的内联模块 — 轻量启动入口，调用 `src/utils/startup.ts` 启动加载状态后动态导入 `src/App.tsx`，并捕获主包加载失败。
- `vite.config.js` — React、Tailwind、Markdown 内容与发布边界插件配置；生产关闭 source map、启用压缩，JS/CSS/媒体统一输出 `assets/[hash]` 文件名，禁用媒体内联；开发/预览的 `/api/ai` 由 AI_PROXY_TARGET 转发，默认公开站点；也可使用 VITE_AI_ENDPOINT 直接跨域连接独立 AI 服务。
- `.github/workflows/3dpage-cicd.yml` — 本项目独立类型检查、构建、GHCR 镜像发布和 SSH 部署；保留入口 Nginx 的路由，2D/AI 容器不随 3D 业务修改重建。
- `.github/deploy/cloudflare.md` — CDN 优化入口；Nginx 为哈希资源设置浏览器和边缘一年缓存，Cloudflare 账户需单独配置 `/assets/` 缓存资格，HTML/404 不缓存。
- `src/App.tsx` — 单页挂载、Context Provider 和文档元信息入口。
- `src/components/` — Canvas、DOM 和 UI 组件，按最近层级 `AGENTS.md` 维护。
- `src/data/note/` — 工程笔记和作品介绍的统一 Markdown 内容目录，图片/视频可与笔记同目录，细则见其 AGENTS.md。
- `src/data/site.ts` — 线上站点公开入口与旧版 2D 绝对链接的唯一来源，由 Vite 代理和站点导航共用。
- `src/context/` — 场景音效偏好 Context，按其 `AGENTS.md` 维护。
- `src/shaders/` — 唯一的自定义揭示材质实现，按其 `AGENTS.md` 维护。
- `src/utils/` — 浏览器运行工具，按其 `AGENTS.md` 维护。
- `build/seo.js` — 使用 `src/data/site.ts` 的公开域名生成首页元信息、robots.txt、sitemap.xml 和可见的 noscript 回退；当前只收录首页，不为场景状态虚构路由。
- `build/` — 仅供 Node.js 使用的构建插件、资源审计和回归测试源码，按其 `AGENTS.md` 维护；不作为构建输出目录。
- `src/global.css` — 全局字体、主题变量和基础样式，维护规则见 `src/AGENTS.md`。
- `tsconfig.json` — TypeScript module resolution and strict checking configuration; it loads Vite client declarations through `compilerOptions.types`.
- `public/` — 通过 Vite 静态导入的图片、字体、音频与图标，按其 AGENTS.md 维护。
- `vendor/` — 已版本化的宠物包；不读取相邻源码。

### Implementation notes


- 本地预览、构建和静态预览分别使用 `npm run dev`、`npm run build`、`npm run preview`；不要臆造额外流程。
- 开发服务会提供源码与开发 source map，仅供本机开发；对外展示应使用生产构建。共享媒体从 `public/` 导入，笔记附件可位于 `src/data/note/`，均生成内容哈希地址；固定 URL 仅发布许可和站点元数据，内部维护文档不进入产物。这些配置不改变代码、素材的实际来源和许可要求。
- `App.tsx` 是直接挂载入口，组件树内联在 `createRoot(rootElement).render(...)` 的 `StrictMode` 内，不额外拆分 `App` 包装组件。
- 标题、描述、canonical、Open Graph、Twitter 与 ProfilePage JSON-LD 由 `build/seo.js` 在 Vite HTML 转换阶段写入，App.tsx 仅维护图标；品牌身份参考本项目站点配置和个人卡片，使用 Laaaanbq / 蓝斌铨，展示页描述应对应个人作品展示。图标维护见 `public/AGENTS.md`。
- `App.tsx` 挂载 `AudioProvider → HomePage`，由 `HomePage` 渲染 `SiteShell` 包裹页面并传入返回主页回调；新增 Context 前确认确实存在跨组件消费者。
- Three.js 内容放在 `canvas/`，普通页面结构放在 `dom/`，站点级控制放在 `ui/`；共享资源使用 `public/` 的静态 `?url` 导入，笔记媒体由构建插件生成同类导入，细则见 `src/data/note/AGENTS.md`，不能拼接旧公开路径。
- 修改页面行为时优先核对 `HomePage.tsx`、`SiteShell.tsx` 和 `App.tsx` 的状态和容器关系。
- 桌面 AI 向导常驻清醒并通过说话气泡提供开屏介绍，手机隐藏整个宠物区域与飞行提示；通过显式能力请求头支持砸碎一块玻璃，完整回答成功后由首页检查入口状态并执行。前后端独立发布，线上动作需要新版独立 AI 服务 配合；白名单协议与兼容规则见后端 AGENTS.md。墙地使用独立 imgaier 材质，来源与完整性见 `public/textures/entrance/AGENTS.md`。
- 门后展示为云层中的“左侧作品卡片 + 右侧技术栈气球”，靠近时向两侧散开；`canvas/portfolio` 管理镜头聚焦，`dom/portfolio/PortfolioDetails.tsx` 展示中文详情，由 `HomePage` 协调。旧头像、奖项和浮岛展示不再挂载。
- 首次展示由 `StartupLoader` 等待资源、DOM 字体与 `SceneWarmup` 后触发；HTML 加载层位于 React 根节点外，根节点保持 `inert` 直到揭幕完成。HTML 内联入口保持动态导入 `App.tsx`，不能静态导入 Three.js 主包，也不能按固定时间移除加载层。
- 仅验证构建时使用 `npm run build -- --outDir node_modules/.cache/startup-preview`，对应 `npm run preview -- --outDir node_modules/.cache/startup-preview`；保留本地 dist，生成产物不再纳入 Git。
- `App.tsx` 直接渲染 `HomePage`，不根据 URL 路径匹配页面；入口切换由首页组件状态控制；应用入口不拦截链接，也不管理网页回顶或相机导航。
- 清理源码时从 `src/App.tsx` 追踪静态、动态与副作用导入；同名材质只保留 `src/shaders/RevealBasicMaterial.ts`，不要同时维护 `.ts` / `.tsx` 副本。
- `tsconfig.json` 允许当前 `.jsx` 场景参与模块解析，并通过 `compilerOptions.types` 加载 `vite/client`；运行资源使用 Vite 导入地址，当前不保留 `src/vite-env.d.ts`。类型检查使用 `npx tsc --noEmit`。

- 加载双圆环使用独立 HTML rotor 包裹静态 SVG，通过 CSS transform 与 will-change 提示合成层旋转；不要改回 SVG circle 内部动画或 JS 逐帧驱动。保持左右纸张图案、正反向周期一致，并保留错误暂停与减少动态效果偏好。验证时检查浏览器合成原因及主线程繁忙期间的旋转。

- 等待期间使用纸张裁剪树外的独立圆环；纸张内两份圆环只在 revealing 时显示，保持同一动画周期与相位，让揭幕图案连续。避免将持续旋转层放回随进度重绘的裁剪纸张内。
- `site.config.json` 与 `.env.example` 维护公开站点、AI 与监控地址；`src/data/integrations.ts` 读取 AI endpoint。模型 Key 不进入 VITE_*。
- 宠物实现属于 @my-page/ai-pet；HomePage 消费 hook / 面板和 sites 配置，EntranceDoors 消费 /three 模型，页面只实现动作白名单回调。
- 包来源是独立 AI 仓库，更新时复制新版本 tgz 并 npm install 锁定；包没有公开发布，不使用跨目录 file 链接。
- `Dockerfile` / `compose.yaml` 提供独立静态部署，AI 使用完整 URL；`.github/` 保留原站点入口代理与兼容回滚。

- GitHub 远程为 `neo-jack/page3d`，公开仓库、master 主分支；主分支以独立项目初始提交重建，重写前历史保存在本机 `.git/history-backups/` 的 Git bundle 中，不发布备份引用。上传默认仅 CI，部署需仓库变量 DEPLOY_ENABLED=true。
