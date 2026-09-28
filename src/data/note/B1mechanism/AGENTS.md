## B1mechanism

3Dpage 性能实践的简短作品介绍。正文简述纸质化视觉与性能取舍，再选取有代表性的实现案例，事实依据当前源码。

### Important files

- `index.md` — 纸质化设计、贴图与基础材质、云纹理复用、场景预热和动画计算的说明。
- 事实来源 — 项目内 `src/components/canvas/`、`src/components/dom/loading/`、`src/components/dom/home/`、`src/components/dom/shared/`、`src/utils/`、`public/AGENTS.md`、`vite.config.js`，以及本仓库 `.github/deploy/nginx.conf`。

### Implementation notes

- 沿用上级简洁、书面的介绍风格，保留少量代表案例，不恢复逐项罗列所有优化机制的长清单。
- 纸质风降低对写实光照和高精度材质的依赖，不等于文字和轮廓可以模糊；区分视觉取舍与实际渲染优化。
- 区分体验改善、传输体积、CPU 更新、GPU 绘制和资源容量，不把预热说成计算消失，也不把少发布文件说成一定减少首屏请求。
- 触摸输入使用帧节流，滚轮保留冲量累加；页面隐藏暂停不等于失焦暂停；场景提前挂载与正文媒体懒加载是不同策略。
- 数值必须来自实现或明确测量；固定 8 张 512×256 云纹理的约 5.33 MiB 是含 mipmap 的 RGBA 容量估算，不是总显存或优化前后实测差值。
- 使用纯文字解释，不补仅重复正文的流程图；不虚构跑分、帧率、提速比例或部署状态。验证沿用上级笔记测试、类型检查、隔离构建与资源审计。
