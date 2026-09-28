1. 先通过代码分析定位问题
发现入口切换时存在几个风险：
- EntranceDoors 原来在进入后直接卸载。
- AboutRoom 虽然提前挂载，但纹理可能还没有上传到 GPU。
- 首次进入时会集中发生纹理上传、材质编译。
- 动画帧中不断创建 Euler、Quaternion 等临时对象。
- InfiniteSkyManager 可能在每帧触发 React state 检查。
因此增加了这些代码：
- SceneWarmup.tsx：
  - 遍历场景纹理。
  - 等待图片 decode()。
  - 分批调用 renderer.initTexture()。
  - 最后调用 compileAsync()。
  - 完成后通知 HomePage。
- HomePage.tsx：
  - 通过 sceneWarm 控制入口门是否可点击。
- EntranceDoors.tsx：
  - 通过 canEnter 拦截预热完成前的点击。
  - 使用 visible={enabled}，进入后保持组件挂载。
- AboutRoom.tsx、SkyChunk.tsx：
  - 使用 useMemo 复用数学对象。
  - 隐藏对象使用 visible=false，避免继续绘制。
- InfiniteSkyManager.jsx：
  - 只在区块边界变化时更新 React state。
SceneWarmup.tsx 的 TypeScript 错误则是静态检查发现的：
let compilationStarted = false;
compilationStarted = true;
这个变量赋值后没有被使用，所以删除了它。同时给异步回调加了：
if (!cancelled && !readyNotified) {
  onReady?.();
}
避免 React StrictMode 下旧 effect 卸载后仍然更新状态。
2. 再通过浏览器运行时信息验证
使用 Playwright 检查了：
- 页面截图和控制台错误。
- Three.js 当前纹理数量。
- WebGL 的 texImage2D、texSubImage2D 调用。
- renderer 的绘制耗时。
- 转场期间的帧间隔。
- R3F 场景中的入口点击区域。
结果是：
- 预热完成后约有 52 个纹理。
- 点击进入后纹理数量没有继续增加。
- 转场期间没有新的集中纹理上传。
- renderer 单次渲染中位数约 3.5ms，最大约 7.9ms。
- 前台测试最大帧间隔约 54ms，相比之前约 337ms 明显降低。
所以结论是：
代码负责解决问题，浏览器运行时数据负责证明问题是否解决。

AGENTS.md 只是同步记录这些长期维护规则，不参与运行，也不会直接改善性能。