## board

墙面简介板的响应式图片和 DOM 文案，作为内容传给入口场景的 Html 锚点。

**Important:** 位置由墙面锚点决定，DOM 尺寸与 Canvas 的 Html 缩放必须成对维护。

### Important files

- `IntroductionBoard.tsx` — 简介板的图片与 DOM 文案，由 `HomePage` 传入入口场景的墙面锚点；组件自身不定位到视口。

### Implementation notes

- 首屏右侧简介由 `IntroductionBoard.tsx` 将 DOM 文字叠加在 从 `public/textures/about/hanging-board.png` 导入图片 的留白区域。正文使用深灰 `#41443f`，不加亚像素文字阴影；拉丁文字保留 `mono`，中文明确回退到苹方/微软雅黑及 sans-serif，避免等宽字体默认回退到新宋体后细笔画发虚。DOM 使用 700px 宽、28px 字号和 3:2 宽高比，配合入口 `Html` 的 `scale={1.5}` 以两倍 CSS 尺寸绘制；两侧参数需成对维护，保持原 350px/14px、scale=3 的墙面尺寸。实际屏幕尺寸及位置由墙面 `Html transform` 锚点控制，进门时随墙面产生透视变化；不能使用 `fixed` 或视口单位让板面、文字跟随镜头。图片保留灰度，整体不设置透明度、不使用正片叠底。板面内侧放置与原图轮廓对齐的不透明底色，阻止墙砖透入；挂绳及板外透明轮廓仍保留。整组保持点击穿透，不添加破碎交互；900px 及以下隐藏简介，`picture` 改用透明占位图以避免下载木板。
- 木板简介正文使用居中的“个人作品集”标题和四行作品方向列表，其中工具作品名称为“界面元素选择器”，保持自然行高与整体居中；不使用 `text-balance`，避免平衡行长导致右侧留白。
- `introBoardReady` 在当前 `picture` 图片解码完成后设置，并与 `sceneWarm` 一起传给 `StartupLoader.ready`，避免揭幕后先出现无板面的文字；桌面木板加载失败进入现有重试流程。
