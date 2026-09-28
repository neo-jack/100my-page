## loading

订阅资源进度、等待 DOM 字体和场景就绪，驱动 React 根节点外的 HTML 纸张加载层。

**Important:** 不要将加载进度订阅移到首页而导致整个 Canvas 重渲染，也不能按固定时间揭幕。

### Important files

- `StartupLoader.tsx` — 订阅 Drei 的 `useProgress`，等待 DOM 字体与场景预热后驱动根节点外的 HTML 加载层。

### Implementation notes

- `StartupLoader` 单独订阅加载进度，避免下载事件反复重渲染整个 Canvas；等待 `tiktok`、`mono`、`tronica-mono` 三个实际使用的 DOM 字体，3D 文本由 Canvas 预热器负责。
- 浏览器验证应包含主包延迟时仍显示纸张、About 资源延迟时不揭幕、加载失败重试、进入 About 无新增场景资源请求，以及移动端/减少动态效果偏好。
