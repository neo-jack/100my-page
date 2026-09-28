## about textures

本目录保存首页简介木板与当前运行的六组技术气球；运行清单由 `src/data/technologyBalloons.ts` 和 DOM 简介板组件决定。

**Important:** 素描和彩绘气球共用平面并通过揭示动画切换；必须保持两态轮廓、标识位置、气结与绳索的配准，不能独立改变构图。

### Important files

- `reactduzybalon*`、`JSSREDNIBALON*`、`gitmalybalon*`、`figmamalybalon*`、`htmlmalybalon*`、`csssrednibalon*` — 六组正面方块纸气球，初版使用内置 image_gen 参考用户 `res/51398e435e5f5c15af04861ec732d7b2.png` 生成。六组正面源图位于 `res/voxel-balloons/front/`；CSS 由 imgaier 参考正面 HTML 生成，848×1264，其余五组由内置 image_gen 生成，1024×1536。保留阶梯方块轮廓、灰白纸格、铅笔纹理、技术标识和方块折线绳。
- `hanging-board.png` — 首页 imgaier 灰白纸木板，尺寸和 DOM 留白规则由上层 `AGENTS.md` 及 `src/components/dom/board/AGENTS.md` 维护。

### Implementation notes

- 本目录只维护当前引用的贴图；不将未挂载的头像、奖项、浮岛、其他技术气球或重复按钮放回运行资源目录。
- 素描从同一张彩色源图逐像素计算灰度（0.2126R + 0.7152G + 0.0722B），保留处理后的 alpha、原生画布及位置；两态透明通道必须逐像素相同，不能分别生成后直接叠加。纹理按原生分辨率无损 WebP 编码。
- 当前尺寸和完整 RGBA 基线记录在 `../../../build/assetBaseline.json`；不要对气球重复执行历史边缘处理。
- 验证悬停上色不发生轮廓跳动，点击弹开/重生正常；触摸设备保持素描态。替换尺寸时须同时核对数据宽高比与材质 UV。
