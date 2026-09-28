## shaders

`src/shaders/` 保存作品卡片按钮与技术栈气球使用的 Three.js 揭示材质。`RevealBasicMaterial.ts` 是该目录唯一源码事实来源，实例与悬停动画由对应 portfolio 组件管理。

**Important:** `RevealBasicMaterial` 只能在 `src/App.tsx` 中通过 `extend({ RevealBasicMaterial })` 注册一次。场景继续使用已有的 `<revealBasicMaterial />` 标签，不新增重复注册、同名 `.tsx` 实现或独立导出入口。

### Important files

- `RevealBasicMaterial.ts` — 扩展 `THREE.MeshBasicMaterial`，维护 `uProgress`、噪声函数、片段着色器注入和程序缓存键。
- 同一文件扩展 R3F `ThreeElements`，为 TypeScript 场景提供 `<revealBasicMaterial />` 的属性与 ref 类型；运行时仍只在 `App.tsx` 注册。
- `../App.tsx` — React Three Fiber 的唯一材质注册入口。
- `../components/canvas/portfolio/PortfolioField.tsx` — 为按钮创建草图揭示层和彩绘底层，使用 GSAP 动画驱动 `uProgress`。
- `../components/canvas/portfolio/TechStackBalloons.tsx` — 气球素描和彩绘层共用相同的悬停揭示机制，并协调点击弹开和重生。

### Implementation notes

- `uProgress` 的约定范围是 `0.0` 到 `1.0`。材质在着色器编译前保存进度值，编译后通过 setter 同步 uniform；调整悬停动画时要同时检查草图层和彩绘层的显示时序。
- `onBeforeCompile` 在 `#include <common>` 后注入 `uProgress`、`paperCell()` 和 `paperWash()`，并在 `#include <alphatest_fragment>` 后执行揭示判断。保持这两个注入锚点及 `vMapUv` 与 `MeshBasicMaterial` 纹理路径一致。
- `paperCell` 使用无三角函数的格点散列，`paperWash` 使用五次插值；纵向揭示叠加 0.135 的纸纤维扰动，进度阈值为 `clamp(uProgress, 0, 1) * 1.46`。仅在进度大于 0.001 时丢弃像素，保证 0 为完整草图、1 为完整彩绘底层。
- `transparent`、`side`、`alphaTest` 和 `depthWrite` 等渲染参数由场景消费者按草图层或彩绘层分别配置；材质模块不加载纹理、不管理场景状态，也不创建 GSAP 定时器。
- `customProgramCacheKey()` 当前返回 `paper-wash-2`。修改着色器源码、宏或渲染行为时同步更新版本，避免复用过期的 Three.js 程序缓存。

### Validation

- 在 `3Dpage/` 目录运行 `npx tsc --noEmit` 检查类型。
- 在 `3Dpage/` 目录运行 `npm run build` 检查 Vite 构建。
- 修改揭示逻辑后，检查按钮和气球的悬停上色、移出还原、气球弹开后重生及减少动态效果偏好。
