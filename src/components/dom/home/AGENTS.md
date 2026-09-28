## home

首页组合、入口与作品选择状态和返回主页；站点控件仍由 ../../ui/SiteShell.tsx 维护。

**Important:** Canvas、入口和 About 保持挂载，首屏 DOM 可见性与进门开始状态同步。

### Important files

- `HomePage.tsx` — 首页入口，组合 `SiteShell`、Canvas、背景色/雾、`AboutRoom`、`EntranceDoors`、首屏标题和简介；维护入口、返回主页、选中作品与聚焦阶段。顶部控件由 `ui/SiteShell.tsx` 维护。

### Implementation notes

- 将 `sceneWarm` 传入 `SceneActivity.ready`，预热完成后才开始常规场景绘制；不要传入揭幕后的 `pageReady`。保持预热与 DOM 图片就绪检查独立，验证首次加载能正常揭幕。

- 组件样式遵守 `../../AGENTS.md` 的重要规则；首屏不叠加十字标记或网格线。
- `AboutRoom` 始终挂载；`hasEntered` 控制入口门和滚动交互状态，不要改回只在进入后创建场景。`isEntering` 由入口门的 `onEnterStart` 设置；底部探索提示与宠物交互通过 `showEntranceContent` 控制，进门动画开始即隐藏；墙面简介板由入口场景定位。
- Canvas 的背景色和雾需要在两个阶段都保持挂载，避免开门飞入期间远景突然失去雾效。
- Canvas 在资源 Suspense 外始终挂载 `SceneActivity`；页面失活/恢复的渲染时钟与 GSAP 协调集中在该组件，规则见 `../../canvas/AGENTS.md`，不要通过重建 Canvas 或重启加载层处理恢复卡顿。
- 入口阶段的地面由 `EntranceDoors` 提供；调整入口组件时保持它与 `AboutRoom` 的同时挂载关系。
- `HomePage` 无路由或初始视图参数；`hasEntered` 初始为 `false`，由开门动画完成后设置为 `true`。
- `hasEntered=true` 且未返回时给 `SiteShell` 传入返回主页回调；点击后设置独立的 `isReturningHome`，关闭详情、隐藏返回按钮和飞行提示，保持 `hasEntered=true` 与首屏 DOM 隐藏。由 `EntranceDoors` 倒退镜头、关门后调用 `onReturnHomeComplete`，再清空入口和飞行状态、恢复首屏内容，不能点击后立即复位相机或滚动进度。Canvas 和场景保持挂载，不重启加载层，不清除声音偏好；飞行提示每次进门重置，不持久化关闭状态。验证须覆盖飞行后返回、再次进门、作品聚焦途中返回及窄屏返回。
- Canvas 外层现在包含简介板的 HTML，不设置 `aria-hidden`，避免向辅助技术隐藏简介正文。
- AI 对话使用独立 `z-45` portal，打开时高于导航，保证浮层向屏幕顶部扩展时关闭和输入控件不被导航遮挡；具体顶部锚点、尺寸与紧凑布局由 已安装宠物包的说明 维护。
- 探索提示只在等待点击门时显示，进门动画开始后隐藏；纸条标题“探索”与正文分行，正文显示“点击物品进行交互,点击门进入作品集空中走廊”；桌面纸条最大宽 23rem、正文 0.8rem、标题 0.92rem、上下内边距 0.75rem，600px 及以下正文 0.7rem、标题 0.8rem、上下内边距 0.625rem，宽度保留视口边距并允许自然换行；纸条使用原始 floor_paper 纹理和近白底色，不叠加染色渐变；正文深灰、标题近黑，保留细锯齿描边与轻阴影，不包含声音状态或音量开关，也不消费 `AudioManager`；提示层保持 `pointer-events-none`，避免阻断门的 Canvas 点击。
- `sceneWarm` 由 Canvas 内的 `SceneWarmup` 回调设置；`pageReady` 在纸张揭幕完成后设置，入口门的 `canEnter` 必须同时满足两个状态。
- 浏览作品时不显示底部作品导航或选择栏，保留 Canvas 的卡片点击交互。

- 飞行纸条通过 `AboutRoom.onFlightHintProgress` 回传的累计距离进度更新 DOM ref 透明度，不逐帧设置首页 state；使用 callback ref 在纸条重新挂载时恢复进度。每次进门重置关闭状态与进度；文案、样式与当次关闭规则见 `../flight/AGENTS.md`。

- `HomePage` 持有 `PaperWindowHandle` ref；AI 完整回答的白名单动作通过 `handleSceneActions` 执行，执行前检查仍在入口且页面和场景就绪。仅支持砸窗，每次选择一个尚未投掷的窗格；实际结果反馈给向导。进门取消 AI 请求。`mobileScene` 监听 `(max-width: 600px), (hover: none) and (pointer: coarse)`，手机竖横屏均隐藏宠物/木板/所有向导 DOM 及飞行提示；进入该模式立即取消 AI 请求，不提供替代按钮。桌面保留宠物与说话气泡。

- 入口不挂载工程卷轴，不维护其展开状态或等待其图片解码；StartupLoader 仅等待 sceneWarm 与 introBoardReady。旧后端返回不支持的动作时反馈不可用，不回退执行砸窗。
- AI 宠物与客户端工具由版本化 @my-page/ai-pet 包维护；本项目保留消费端协议测试，服务地址见 src/data/integrations.ts，不导入后端源码。
