## public

`public/` 保存当前运行使用的纹理、音频、字体与品牌图标，以及许可文档和资源校验清单。源文件名用于本地维护；公开资源地址由内容哈希生成，仅被引用的媒体进入发布包。

**Important:** 资源迁移和无损重编码不改变实际来源与许可要求；许可文档保留发布，构建校验清单不能导入浏览器。

### Important files

- `textures/` — 门窗、花坛、云层、气球、纸纹、卡面与卷轴；按近旁 AGENTS.md 维护。
- `fonts/` — DOM 和 Three.js 文字使用的本地字体，字节保持不变。
- `sounds/` — 气球单次爆破声及已停用的风声源文件，来源、发布状态、处理方式与指纹见该目录说明；`bgm.mp3` 为独立背景音乐。
- `icon.svg`、`apple-icon.png` — 透明蓝色 L 品牌图标，由 `src/App.tsx` 导入；Apple 图标为 512×512 PNG。
- `../build/assetBaseline.json` — 当前图片尺寸、文件 SHA-256 与完整 RGBA 校验值，仅供 Node 校验，不保存制作历史。

### Implementation notes

- 此目录是资源源码目录：Vite 必须保持 `publicDir: false`，不能开启默认原样发布或将本目录直接作为服务器根目录。运行媒体通过相对 `?url` 导入，HTML 使用 `/public/` 构建引用；部署只使用构建产物。
- `AGENTS.md`、构建校验清单和未引用媒体不发布；旧媒体 URL 与 `/public/` 源路径继续返回 404/no-store。

- TS/TSX 用静态 `?url` 导入；CSS 用相对 `url()`，HTML 的首屏预加载和内联背景引用 `/public/`，均由 Vite 重写。不得在运行时拼接源文件名。
- `vite.config.js` 禁用资源内联；媒体输出 `assets/[hash][extname]`，JS/CSS 同样不包含模块原名。`public/` 不作为历史参考素材归档目录。
- 清理资源时核对静态导入、CSS、HTML 预加载和纹理数组，同步更新 `../build/assetBaseline.json`，运行像素校验、构建和发布审计；许可声明不能按“无浏览器引用”删除。
- 图片使用 Sharp 的无损 WebP（`lossless: true, exact: true, effort: 6`）或 PNG（`compressionLevel: 9`）；`exact` 用于保留透明像素的 RGB。音频、字体和 SVG 不做无损栅格转换。
- 在 `3Dpage/` 运行 `node build/assetIntegrity.js` 验证尺寸和完整 RGBA；原文件像素基线必须在转换前记录，不得用转换结果覆盖基线掩盖差异。替换设计时明确更新该图记录，并重新核对页面。
- 替换设计时核对尺寸、UV 和透明边缘，更新当前基线；不能将参考编辑描述为从零原创。
- 气球素描和彩绘两态共用透明通道，配准规则见 `textures/about/AGENTS.md`；完整 RGBA 校验包含边缘像素。
- 无损编码可能增加文件大小；不以缩放、降色或有损参数换取体积，不通过图集调整破坏现有 UV、alpha 点击和材质颜色空间。
- 源文件名不能承担运行逻辑：花坛颜色图按导入 URL 集合识别；云层已改为 `canvas/about/cloudField.ts` 程序化生成，本目录旧云图不再被引用或发布。
