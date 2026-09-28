## utils

`src/utils/` 保存浏览器运行工具；Node.js 构建、资源审计和发布验证工具集中在 `../../build/`。

**Important:** 本目录位于浏览器导入链，不引入 Node.js API 或 `build/` 中的构建工具。

### Important files

- `performance.ts` — 滚轮与触摸回调的帧节流。
- `scenePerformance.ts` — 单 Canvas 的按需性能订阅；采样由 `SceneActivity` 驱动，面板通过 `useSyncExternalStore` 读取，每秒发布一次，无订阅时跳过统计和场景遍历。
- `deviceDetect.ts` — 触摸设备检测。
- `startup.ts` — 加载阶段、进度和纸张揭幕，保持启动包轻量。

### Implementation notes

- 聊天错误使用中性文案，不使用角色昵称；TIMEOUT、INVALID_REPLY_FORMAT 和 UPSTREAM_ERROR 分别提示超时、内容不完整和模型服务不可用，不透传上游原始错误。

- 输入监听由组件 effect 管理，工具不维护全局监听；纹理由 Drei 缓存管理。
- 性能面板纹理估算对场景材质、uniform、背景和环境中引用的 Texture 对象去重，按格式、数据类型与 mipmap 尺寸计算，包括隐藏对象；不包含几何体、帧缓冲、未引用的缓存或驱动开销，不称为总显存。未知格式显示不可用；统计不调用同步 GPU 查询、不读像素、不自行创建定时器。最后一个订阅卸载时清空快照与采样窗口。
- `SiteCard` JSON 仅允许已收录的 `id`，不得接受模型提供的 URL 或动作；流式围栏未闭合时保持 pending，流结束仍不完整则视为无效。普通代码围栏不能误识别为卡片。
- `readFollowUpQuestions` 仅解析完整且唯一的 FollowUp 围栏，严格校验 2–3 个不重复、2–60 字的问题；缺失或非法时返回空列表。不得基于提问、回复关键词或固定模板补卡片、补追问；后端负责模型输出校验和补全。
- 聊天会话不持久化；收藏功能已移除，工具不读取、写入或迁移旧收藏数据。
- `startup.ts` 不导入 React/Three.js；进度按资源、DOM 字体与场景准备加权，全部准备好前最多 99%。不按时间跳过加载，不显示慢网/重试提示，不吞掉失败。
- 揭幕后才解除 `#root` 的 `inert` 和 `aria-busy`；失败保持加载层并暂停圆环。支持减少动态效果，重复完成复用 Promise。


- `useSceneTexture.ts` 复用 R3F useLoader / TextureLoader 缓存与 Suspense，支持单 URL、数组和键值对象，不在 effect 中上传 GPU；首屏纹理统一由 SceneWarmup 分帧上传。不要改回 Drei useTexture，其挂载 effect 会立即批量 initTexture，绕过预热调度。

- 加载进度的 --load-offset 只写入 startup-tear 元素，不写在 loader 根节点，避免每次进度更新使圆环继承样式失效。
- AI 宠物与客户端工具由版本化 @my-page/ai-pet 包维护；本项目保留消费端协议测试，服务地址见 src/data/integrations.ts，不导入后端源码。
