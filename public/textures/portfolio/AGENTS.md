## portfolio

`portfolio/` 保存漂浮作品卡片的运行时封面与现有按钮源文件；实际封面由 `src/data/note/catalog.json` 引用。

**Important:** 三张中文卡面由 imgaier 基于原纸纹卡片生成，属于示意封面，不代表真实产品截图；第三张对应“界面元素选择器”。

### Important files

- `preview-button.webp` — imgaier 文生图重新生成的冷灰白皱纸与无字铅笔双线边框，用于所有笔记正文预览按钮；从生成 PNG 无损转码，RGBA 基线存于 `../../../build/assetBaseline.json`。`NoteMarkdown.tsx` 静态导入，通过居中背景纵向放大收起上下留白、multiply 混合纸色；按钮文字由 DOM 显示。

- `react-core-zh.webp`、`design-workflow-zh.webp`、`context-tool-zh.webp` — 当前三项作品的完整中文卡面，约 1097×1434，包含纸纹、双线边框、标题、示意图、分类和“探索作品”按钮。
- `button.webp` — 现有素描按钮源文件，DOM 详情已不再引用，不进入发布包；原参考来自 `res/ref/public/textures/gallery/przyciskdotylukartki.webp`。已用 imgaier 参考编辑，微调空白框的双线和角部，保持 1024×256；保持当前半透明边缘。中文卡片按钮取样完整卡面。
- `public/THIRD-PARTY-NOTICES.txt` — 上游按钮纹理的 MIT 许可，发布时保留。

### Implementation notes

- 资源从本项目 `public/textures/portfolio/` 静态导入；不跨目录依赖 `res/ref/`。
- 当前中文卡面及其按钮取样纹理在入口的共用 Suspense 边界内加载并参加 `SceneWarmup`；DOM 详情仅保留标题、关闭按钮和正文。资源清单仍包含三张中文卡面和未引用的 `button.webp`；后续清理源文件时同步维护完整性清单与许可，不恢复固定底部按钮。
- 重制卡面时使用 imgaier 的 `edit` 入口，参考现有卡面，保持浅米白皱纸、灰绿铅笔线稿、细双线边框和简体中文；React 等技术专名可保留原文。生成 PNG 后只做经过 RGBA 像素校验的无损 WebP 编码，不在代码中拼接第二套标题。
- 卡面约为 13:17；三张生成图的按钮框存在少量像素差异，由 `PortfolioField.tsx` 的 `BUTTON_LAYOUTS` 分别校正：01 `2.88×0.45, y=-2.01`，02 `2.93×0.47, y=-2.05`，03 `2.92×0.53, y=-1.95`。重新生成后核对对应卡面的按钮 UV 取样，避免悬停时裁断文字。
- 卡面顶部统一“编号 / 精选作品”，底部统一“探索作品”；两行标题和分类烘焙在卡面图片内，Markdown 头部仅保留详情标题 `title`，不再配置 `coverTitle` 或 `category`。修改卡面文案时更新图片，并核对对应笔记标题与浏览、聚焦状态；详情不展示卡面的编号或分类。

- `context-tool-zh.webp` 的标题为“界面元素 / 选择器”，插图为浏览器选框到 AI 上下文，标注“选择元素 / 交给 AI”；通过 imgaier 参考编辑原卡面后无损编码，当前像素基线见 `../../../build/assetBaseline.json`。
