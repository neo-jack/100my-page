## note

工程笔记与作品介绍的统一内容来源，每篇 Markdown 与可选的图片/视频放在独立目录中，具体写法见 `README.md`。

**Important:** Markdown 头部只保留 `title`，正文只维护在 Markdown；场景配置放在 `catalog.json`。不恢复 `engineeringNotes.ts` / `portfolio.ts` 内容数组，也不把当前占位内容描述为已完成成果。

### Important files

- `*/index.md` — 当前五篇工程笔记、三篇作品与一篇独立 AI 对话架构说明；YAML 头部只维护标题，正文由 Markdown 展示。
- `catalog.json` — 按笔记 ID 配置场景类型、排序及作品的封面和气球，不保存标题、正文或详情展示字段。
- `index.ts` — 导入构建生成的 `virtual:notes`，为卷轴与作品场景导出同源数据。
- `types.ts`、`virtual.d.ts` — 内容类型、作品交互阶段与虚拟模块声明。
- `README.md` — 新增笔记、同目录图片和视频的使用示例。
- `B1mechanism/AGENTS.md` — 性能文章的逐项写作结构、实现来源及数据表述边界。
- `../../../build/notes.js` — 递归收录、元数据校验、相对资源导入和开发刷新。

### Implementation notes

- 正文中仅含链接的段落由 `NoteMarkdown.tsx` 渲染为手绘边框按钮组；多个链接连续换行、不插空行，组内间距固定 4px，无需 `preview` 标记。兼容旧标记，不使用原始 HTML；写法见 README 的“预览按钮”。未发布作品不虚构链接。

- 收录所有内容 `.md`，排除 README、AGENTS 与隐藏目录；支持 `主题/index.md` 或独立 `.md`。ID 来自目录/文件名，全目录唯一；重命名或删除时同步维护 catalog 键。按 catalog 中的 order、ID 排序，未配置条目默认作为工程笔记排在已配置条目之后。
- catalog 中 `kind: engineering` 在卷轴中平铺显示；`kind: portfolio` 进入 3D 卡片队列，三种内容共用 `dom/shared/NoteMarkdown.tsx`。详情只展示顶部标题和正文，不提供编号、分类、摘要栏、技术标签或固定底部按钮；外链使用正文 Markdown。
- 同目录图片及视频使用 `![](./相对路径)`；编译器通过 Markdown AST 处理行内与引用式链接，不改代码块。播放器按资源扩展名识别 MP4/WebM/OGG/MOV，使用控制条、playsInline、metadata 预载，不启用自动播放。不启用原始 HTML。
- 资源仅允许从 note 或 public 导入；由 Vite 输出内容哈希文件名，未引用附件及维护文档不发布。发布审计将笔记图片与本地附件字节比对，public 图片由 `build/assetBaseline.json` 的当前像素基线校验。
- 现有卡面引用 public 的共享素材；新增内容可将封面和正文媒体放在自己的目录，不复制气球映射。catalog 的 cover 路径相对于对应 Markdown 解析；气球来源为 `../technologyBalloons.ts`。
- catalog 的 `kind: standalone` 仅进入 `NOTES`，由专属入口按 ID 读取，不出现在工程卷轴或作品卡片。`C1chat/index.md` 保留为独立内容源，但当前入口不再挂载纸条弹窗；修改时核对已安装 @my-page/ai-pet 的客户端协议与独立 AI 仓库的接口，不公开上游运行配置。
- 详情滚动、模态焦点隔离、关闭与相机阶段由组件负责；内容层不引入路由或浏览器状态。
- 校验沿用根目录的类型检查、构建和审计命令；编译器回归使用 `node --test build/notes.test.js`。

- 对外正文使用简洁、书面的项目说明语气，减少对话式提问、口头衔接词和重复表达；保留技术事实、能力边界及真实链接，不补写未经确认的成果。
- 工程笔记以简洁正文为主，不添加仅重复正文的流程图。配图应提供实际界面、操作过程或结果对比等额外信息；没有合适素材时保留纯文字。设计工作流已有真实运行截图按其子目录规则维护。
- 内容依据：性能见 `src/components/canvas/SceneActivity.tsx`、`SceneWarmup.tsx` 和 `src/utils/startup.ts`；CDN 见仓库 `.github/deploy/cloudflare.md`；SEO 见 `build/seo.js`；CI/CD 见 `.github/workflows/3dpage-cicd.yml` 及部署脚本；监控见独立 `105my-monitor/README.md` 与实现。页面配置路径相对于本仓库，独立项目只作为文档参考，不是构建依赖。
- `B3seo` 为 SEO，`B4monitor` 为前端监控，`B5cicd` 为 CI/CD 流水线，目录名与正文主题保持一致。
- `B3seo` 简述框架选择与构建期 SEO 思路；可类比 Next.js 的提前生成方式，但须区分元信息注入与整页 SSR / SSG，不将当前 Vite 实现描述为作品正文已预渲染。
- 有真实公开入口的作品使用简洁介绍与链接按钮；没有独立预览入口的工程主题直接讲解实际实现，不为它们虚构站点或强行配图。配置事实不等于已部署或实测成果，不编造命中率、帧率、排名及耗时。
- 私密资料只用于核对用户指定的公开项目地址；不要复制管理后台、服务器 IP、凭据或本机私密路径到正文与附件。当前公开入口与源码链接同时依据对应项目文档和 Git 远端核对。

- 目录采用大写分类字母＋序号＋英文主题：A 为作品，B 为工程笔记，C 为独立说明（如 A1react、B1mechanism、C1chat）；页面标题仍由 Markdown 维护，场景类型与顺序仍以 catalog 为准。重命名作品时同步 PortfolioField.tsx 的 BUTTON_LAYOUTS 键，独立说明同步 HomePage.tsx 查询 ID。
重命名目录后，编辑器中的旧路径标签页需关闭并从新目录重新打开，避免保存时重新创建旧目录。编译器自动收录内容 Markdown；正文与附件必须一起迁移，不保留引用已搬走附件的重复正文。

- 显式下载附件使用 `[文字](./downloads/name.js.txt "download:name.js")` 或 `.md.txt` / `download:SKILL.md`；仅此双扩展名文本附件可通过 download 标记导入，Vite 输出哈希 `.txt`，阅读器使用原生 download 恢复文件名。附件 MD 不参与笔记收录；只发布明确引用且已脱敏的快照。
