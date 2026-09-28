## entrance

`entrance/` 是站点入口场景，按物品大类组织门、墙、窗户、宠物、花坛和地面；首页通过 `door/EntranceDoors.tsx` 组合各物品，跨物品的碰撞逻辑放在 `shared/`。

**Important:** 门打开时必须能看到后方 `AboutRoom`；门洞是墙板之间的真实缺口，不能用整块不透明平面补齐。

### Important files

- `door/` — 入口门；职责与交互规则见 `door/AGENTS.md`。
- `wall/` — 入口墙体；职责与交互规则见 `wall/AGENTS.md`。
- `window/` — 入口窗户；职责与交互规则见 `window/AGENTS.md`。
- `pet/` — 入口宠物；职责与交互规则见 `pet/AGENTS.md`。
- `planter/` — 入口花坛；职责与交互规则见 `planter/AGENTS.md`。
- `ground/` — 入口地面；职责与交互规则见 `ground/AGENTS.md`。
- `shared/` — 入口共用运动；职责与交互规则见 `shared/AGENTS.md`。

### Implementation notes

- 同一物品的组件、几何和布局辅助文件放在同一分类目录；新增分类时同步维护近旁说明，不把文件重新平铺回入口根目录。
- `door/EntranceDoors.tsx` 继续负责资源加载、物品组合与相机交接；各物品通过 props 协作，DOM 内容由 `../../dom/` 提供。
- 类型检查与构建沿用项目根 `AGENTS.md`；物品交互的验证规则见各分类说明。
- 墙体与地面分别使用独立的 `wall-paper.webp` 和 `ground-paper.webp`，保留可见纸感肌理；`floor_paper.webp` 继续用于宠物、碎片和 DOM 纸条，不能随墙地改图一起覆盖。
- 地面高度由 `door/EntranceDoors.tsx` 的 `groundY` 同时传给纸质地面、花坛与窗户，当前为入口局部 `y=-2`；门底、门框和石板路共用 `floorY=groundY+0.005`，不再悬高于地面。碎片父组位于各窗格，计算碰撞高度须减去窗格 y；散落范围保持在窗下花坛和纸质地面，保持窗下散落边界，不侵入门前石板路。纸质地面纹理为不含 alpha 的 RGB 图，使用不透明材质，使地面先于透明碎片/接触阴影绘制；不能将其改回透明队列，否则地面会盖住已落地的碎片。
- 新增入口资源时同步检查 `public/textures/doors/`、`public/textures/entrance/` 和静态导入；不要在组件内复制绝对路径清单。
- 用户参考门窗和长方石板路的裁切、蒙版与来源规则见上述资源目录；它们与花坛颜色贴图一同通过导入 URL 集合设为 sRGB。石板路的各向异性采样取硬件上限与 16 的较小值，其余入口纹理上限 8，并保留 mipmap 与线性过滤。新墙地颜色图使用 sRGB；共享底纸仍保留原颜色空间，避免改变墙、石头和宠物的材质约定。

- 纸宠物模型从 @my-page/ai-pet/three 安装包导入，模式类型来自包主入口；宠物不依赖本目录源码。
