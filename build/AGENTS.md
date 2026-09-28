## build

`build/` 保存仅供 Node.js 使用的 Vite 插件、图片完整性工具和发布回归测试。浏览器工具位于 `../src/utils/`，构建配置入口为 `../vite.config.js`。

**Important:** 本目录是受版本管理的构建工具源码，不是输出目录；不得作为构建产物清理或覆盖，也不得从 React、启动入口或其他浏览器模块导入。

### Important files

- `productionBoundary.js` — 固定 URL 文档筛选、哈希媒体输出检查及预览路径隔离，由 `vite.config.js` 导入。
- `notes.js` — 递归扫描 `src/data/note/`，校验仅含 title 的 YAML 头部及 catalog 场景配置，以 Markdown AST 重写相对媒体引用为 Vite 导入，生成 `virtual:notes`，开发时监听内容与配置增删改。
- `notes.test.js` — title-only 头部、catalog 的封面/排序/气球、默认工程笔记与 standalone 独立内容收录、生产媒体打包、引用式链接/中文文件名、代码块保留、缺失附件及重复 ID 回归。
- `assetIntegrity.js` — 无损编码助手及当前图片尺寸、完整 RGBA、文件哈希和音频指纹校验。
- `assetBaseline.json` — 当前图片的文件名、尺寸、文件与像素 SHA-256；不保存原文件指纹或制作历史。
- `auditAssetRelease.js` — 检查发布目录的旧路径、未验证图片、缺失启用音效、误发布停用音效与脚本残留资源名。
- `productionBoundary.test.js` — 生产配置、静态导入、HTML/CSS 资源复用、预览 HTTP、Nginx 规则和无损像素回归测试。
- `aiChat.test.mjs` — 使用 Node.js 24 内置 TypeScript 擦除测试浏览器 SSE 工具；覆盖分字节中文/CRLF、流中断、限流、取消和对话裁剪，不请求真实模型。
- `siteCards.test.mjs` — SiteCard/FollowUp 分片解析、追问结构与服务端协议要求、纯文字不自动生成卡片/追问、未知 ID/附加字段拒绝及链接过滤回归。

### Implementation notes

- `node --experimental-strip-types --test build/balloonRaycast.test.mjs` 使用真实气球贴图与 Three.js 射线验证透明区域穿透、实色命中、缓存及禁用/隐藏状态。
- Vite 关闭 source map 和 `copyPublicDir`、启用压缩与 hash-only 输出名。`publicDir: false` 禁用默认直出；`public/` 媒体经静态导入生成哈希地址，插件仅按固定 URL 发布许可文件及站点元数据。
- 许可文档（包括 Markdown 和位于旧纹理目录的 sidecar）保持可访问。维护文档、隐藏目录、源码不发布，不跟随符号链接。
- 旧 3D 媒体路径在预览和 Nginx 中主动返回 404/no-store，即便磁盘存在旧副本；缺失媒体不回退到 SPA HTML。`/2D/` 保持独立。预览 HTML 由 Vite 要求重新验证，生产 HTML 使用 no-cache/no-store，哈希资源成功响应使用 immutable。
- `assetIntegrity.js` — 无损编码助手及当前图片尺寸、完整 RGBA、文件哈希和音频指纹校验。
- `assetBaseline.json` — 当前图片的文件名、尺寸、文件与像素 SHA-256；不保存原文件指纹或制作历史。
- 完整 RGBA 指纹覆盖 RGB 和透明通道；音频许可与当前校验数据位于 `public/sounds/sources.json`，不导入浏览器。
- 音频来源清单的 `publish: false` 仅停用发布，源文件仍须通过完整性校验；发布审计要求其字节不出现在产物中，其余音效仍须存在。
- 图片完整性回归将 `public/` 的实际 WebP/PNG/JPEG 文件与清单逐项比对，并验证各图像素基线；不固定历史图片数量。新增或删除资源时同步维护清单，避免漏记、重复或遗留条目。
- 图片校验和发布审计的默认资源目录按 `import.meta.url` 定位到 `../public/`；测试从 `../.github/deploy/nginx.conf` 读取生产 Nginx 配置。移动脚本时同步更新这些相对路径、Vite 导入和 CI 命令。
- 在项目根目录 运行 `node --test build/productionBoundary.test.js` 执行回归，`node build/assetIntegrity.js` 独立检查图片；CI 使用同一测试命令。
- 在项目根目录 运行 `node --experimental-strip-types --test build/aiChat.test.mjs build/siteCards.test.mjs` 验证聊天流客户端、卡片协议和链接过滤；组件行为另用浏览器模拟 SSE 验证分片占位、Markdown、卡片访问、滚动区域末尾最多两条快捷提问（短回答贴底、长回答随正文滚动）与窄屏布局，以及失败提示、连续提问和进门时取消，不请求真实模型。
- 在项目根目录 执行 `npx tsc --noEmit` 后运行 `npm run build -- --outDir node_modules/.cache/startup-preview`，再执行 `node build/auditAssetRelease.js node_modules/.cache/startup-preview`；仅验证时避免覆盖已跟踪的 `dist/`。CI 对 `dist` 做同样审计。
- 构建校验清单、未引用素材和维护文档不得进入运行时映射；审计不修改源文件。
- Markdown 解析仅在 Node 构建侧运行（yaml、unified、remark-parse、remark-stringify），浏览器只收到标题、必要的场景字段和资源地址已重写的正文；GFM 渲染由已有 React Markdown 完成。头部仅允许 title，场景类型、排序、作品封面和气球读取 note/catalog.json；未配置笔记默认为排在已配置条目之后的 engineering；standalone 进入统一数据但不进入工程或作品列表，供专属入口读取。维护 Markdown、隐藏目录和未引用附件不进入内容清单。
- 笔记附件可位于 note/，原有共享场景素材继续位于 public/；`auditAssetRelease.js` 额外核对 note/ 栅格附件字节，保留 public 完整性基线、当前图片及音频发布检查。编译器只允许 note/public 的本地媒体导入。
- 在项目根目录 运行 `node --test build/notes.test.js` 验证内容编译；测试临时目录位于 `node_modules/.cache/`，不覆盖 dist。新增内容后也运行类型检查、构建与发布审计。

- `seo.js` 在 HTML 转换阶段注入静态 SEO 元信息与 noscript 回退，并为开发服务及构建产物提供 robots.txt、sitemap.xml。域名由 Vite 从 site.ts 传入；不要在 public/ 重复维护同名文件。仅列入实际可独立访问的页面，不加入场景状态或虚假更新时间。
- 浏览器 `<title>` 固定为 `LBQ©3D©2026`，在 `seo.js` 中维护；社交分享标题、结构化数据与 noscript 继续使用描述性作品集标题。

- 笔记 ID 允许大小写英文字母、数字和短横线，保持原始大小写；note 目录使用 A/B/C 分类编号，catalog 键与组件查询必须完全一致。

- 笔记显式下载支持 `.js.txt` / `.md.txt` 附件和 `download:<文件名.js|md>` 链接 title；仅此扩展名与标记组合允许作为文本资源导入。保留 note/public 路径边界；下载资源输出哈希 `.txt`，不放宽内部 `.md` 与源码发布限制。

- 聊天测试同时覆盖 SceneAction 白名单、重复/半截/嵌套围栏拒绝、能力请求头，以及错误/取消/缺失 done 不提交动作；浏览器模拟 SSE 验证真实卷轴展开、砸窗的一次性上限、离场阻止旧指令、手机竖横屏隐藏宠物与飞行提示、切换到手机时取消请求。
- AI 宠物与客户端工具由版本化 @my-page/ai-pet 包维护；本项目保留消费端协议测试，服务地址见 src/data/integrations.ts，不导入后端源码。

- productionBoundary.test.js 同时验证根 nginx.conf 的独立静态部署与 .github/deploy/nginx.conf 的原站点网关配置。
