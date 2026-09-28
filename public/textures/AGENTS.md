## textures

`textures` 保存当前入口门、纸纹地面、云层和关于场景的运行时纹理；以 `src/components/canvas/entrance/`、`src/components/canvas/about/` 和 `src/components/dom/home/HomePage.tsx` 的加载路径为准。

**Important:** 这里是当前运行时资源，不是整体可删除的历史目录。检查 `useTexture`、`useLoader`、预加载列表及纹理数组后再清理，不要只依据单次页面请求判断使用情况。

### Important files

- `paper-texture.webp` — HTML 加载画面的轻量纸纹，使用 imgaier 参考原 ITom 纸纹轻微改变皱褶，保留 1215×680、暖白底色与不透明画布；来源及许可见 `public/THIRD-PARTY-NOTICES.txt`。
- `doors/` — `EntranceDoors.tsx` 加载的门框、双开门、背面、边缘和把手纹理；用户原图裁切及配准规则见该目录 `AGENTS.md`。
- `entrance/floor_paper.webp` — 宠物、石头、碎片和 DOM 提示共用的底纸；墙与地面分别使用独立的 `entrance/wall-paper.webp`、`entrance/ground-paper.webp`。
- `entrance/stone-path.webp` — `EntranceDoors.tsx` 加载的门前石板路纹理。
- `entrance/window_sketch.webp`、`entrance/window_glass.webp` — 入口门右侧的三格窗框和配准玻璃原图，由 `EntranceDoors.tsx` 加载并交给 `PaperWindow.tsx`；点击破碎由几何动画实现，像素洞口、UV 与参考来源见 `entrance/AGENTS.md`。
- `entrance/garden-*.webp` — imgaier 生成的门两侧木槽纹理、三种可折断纸花与多肉；来源、尺寸和透明通道规则见 `entrance/AGENTS.md`，上游主参考许可随 `public/THIRD-PARTY-NOTICES.txt` 保留。
- `clouds/` — 已停用的八张云纹理，保留源文件与完整性记录；当前云层由 `canvas/about/cloudField.ts` 程序化生成，这些图片不进入发布包。
- `about/` — 首页木板与作品技术栈使用的六组素描/彩绘气球；成对配准规则见该目录 `AGENTS.md`。
- `public/THIRD-PARTY-NOTICES.txt` — ref 气球图及移植交互的上游 MIT 许可，随资源保留。
- `portfolio/` — imgaier 生成的三张中文作品卡面及现有按钮源文件，当前资源引用、来源和许可见该目录说明。
- `engineering/` — 首屏悬挂卷轴的九宫格纹理，复用右侧挂板的纸纹和挂绳；来源和切片规则见该目录说明。
- `about/hanging-board.png` — 通过 imgaier 参考入口纸纹场景生成的灰白铅笔木板，1536×1024 透明 PNG，包含挂绳及钉头，由 `HomePage.tsx` 的响应式 `picture` 加载；中央留白承载带浅凹刻样式的 DOM 简介文字，正文不烘焙进图片。更换图片时同步核对组件内的图片尺寸、宽高比、色调混合和文字安全区域。

### Implementation notes

- 作品场景的纹理引用以 `PortfolioField.tsx` 和 `data/note/catalog.json` 为准；中文卡片从整图取样按钮完成悬停。DOM 详情已移除固定底部按钮，不再引用 `portfolio/button.webp`；未引用源文件不进入发布包，清理仍须遵守 public 的完整性与许可规则。
- 技术栈气球在 `data/technologyBalloons.ts` 显式导入素描和彩绘 URL，组件不再拼接文件名；构建只发布被引用的素材，原始命名保留在源码维护与 Git 历史中。
- 图片采用无损编码，尺寸与完整 RGBA 基线记录在 `../../build/assetBaseline.json`；新增或替换图像后更新基线并验证。
- 气球素描和彩绘共用轮廓及 alpha；入口门窗保持 UV 配准和透明洞口，具体规则见各资源子目录。
- 保持文件名大小写与源码一致；旧云图已无运行时宽高比映射，程序化云形的尺寸规则在 `canvas/about/cloudField.ts` 维护。
- 从参考项目复制资源时放到本项目的实际加载路径，不在组件中跨项目引用，也不额外发布无引用的备用副本。
- 加载画面纸纹由 `index.html` 高优先级预加载，路径独立于场景贴图；图片未返回时使用浅纸色背景，百分比和裂缝不依赖该图片或 Web 字体。
