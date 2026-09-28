## data

`data/` 保存首页和 3D 作品展示共用的内容及公开站点地址，作为作品名称、介绍、封面及发布链接的唯一来源。

**Important:** 作品发布状态以各项目事实为准；“界面元素选择器”介绍依据 101my-aitool 现有能力，手绘封面仍为示意图，不得虚构已上线链接、成果数据或完成状态。

### Important files

- `note/` — 工程笔记与作品统一 Markdown 来源，场景配置由其 `catalog.json` 维护；具体写法与媒体规则见 `note/AGENTS.md` 和 `note/README.md`。
- `technologyBalloons.ts` — 技术栈气球的素描/彩绘资源映射和 key 类型，不保存作品文案。
- `site.ts` — 线上站点域名入口和旧版 2D 绝对链接；Vite 开发/预览代理与 `ui/SiteShell.tsx` 共用，不包含模型网关或凭据。

### Implementation notes

- 公开站点地址默认由根 site.config.json 提供，VITE_SITE_ORIGIN 可覆盖，site.ts 负责导出导航使用的地址；AI 接入使用 integrations.ts 的 VITE_AI_ENDPOINT。开发代理可配置本地或远程服务，模型凭据始终留在后端。
- 详情不提供固定的发布按钮；实际发布链接通过 Markdown 正文维护，不虚构尚未上线地址。
- 卡面标题、分类、插图标注和“探索作品”入口使用中文（React 等技术专名保留原文），由 imgaier 烘焙进完整卡面；修改卡面文案时同步重新生成对应封面，不能只改数据。
- 中文名称和完整介绍继续在 DOM 层展示；卡片不使用 Troika 绘制中文，也不请求在线中文字库。
- 修改作品 ID 时同步检查封面路径；Canvas 卡片和 DOM 详情都消费同一数组，不另写副本。
- catalog 的 `balloons` 引用 `TECHNOLOGY_BALLOONS` 的类型化 key；当前技术栈同属示意占位，正式发布前以真实项目清单替换。映射保存显式导入的 `sketch` / `painted` URL；CSS 正面纹理为 848×1264，宽高比为 `848 / 1264`；其余五组为 1024×1536，宽高比为 `2 / 3`，保持方块与图标原比例。触摸端复用素描 URL，不拼接文件名。
- 工程优化和作品的标题维护在 `note/` 的 Markdown 头部，正文使用 Markdown，不在组件中复制内容；场景类型、排序和封面等仅在其 catalog 中维护。工程列表平铺，无嵌套子条目。
- AI 宠物与客户端工具由版本化 @my-page/ai-pet 包维护；本项目保留消费端协议测试，服务地址见 src/data/integrations.ts，不导入后端源码。
