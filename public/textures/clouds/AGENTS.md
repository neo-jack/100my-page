## clouds textures

本目录的八张透明手绘云已停止运行时引用，不进入发布包；其来源为 imgaier 参考旧图生成的轻微排线变体。当前云形由 `src/components/canvas/about/cloudField.ts` 程序化绘制。

**Important:** 这些贴图不参与当前云层渲染，不要恢复固定索引与宽高比映射；图片仍受当前像素基线校验。

### Important files

- 八张 `.webp` — 保留画布尺寸和云体轮廓，白色云体内部增加少量浅铅笔排线；保持当前半透明边缘。
- `../../../build/assetBaseline.json` — 当前图片尺寸、文件和完整 RGBA 校验值。

### Implementation notes

- 八张原图曾合成两列四行参考图集后通过 imgaier 编辑，分别配准回各自画布；图集只用于制作，当前页面不再加载这些纹理。
- 导出保持中性灰度、当前 alpha 基线和小尺寸云的线宽，避免生成背景、阴影或灰色矩形；不重新套用原图蒙版覆盖已记录的边缘版本。
- 验证云层穿行、前后遮挡与边缘；保持来源说明和 `../../THIRD-PARTY-NOTICES.txt`，参考编辑不改变来源链。
