## A3context

“界面元素选择器”的作品介绍，功能事实来源为同级项目 `101my-aitool` 的源码与使用说明。

### Important files

- `index.md` — 详情标题与使用介绍。
- `images/动画1.gif`、`images/动画2.gif`、`images/动画3.gif` — 用户提供的真实操作录屏，依次展示 Codex 对话、源码定位、网页内容复制到 Figma；正文通过相对路径引用原始 GIF。
- `../catalog.json` — 保留 `A3context` ID、作品排序和封面引用。
- `../../../../public/textures/portfolio/context-tool-zh.webp` — imgaier 生成的纸张手绘卡面。

### Implementation notes

- 对外名称统一为“界面元素选择器”；修改名称时同步门牌、2D 导航和工具安装页，卡面文字需通过 imgaier 重新生成。
- 介绍聚焦元素选择、截图和上下文、React/Vue 源码定位及 Codex 协作；源码定位依赖调试信息，不承诺所有页面可用。
- 保留现有 ID 和资源路径，不因展示名称调整而迁移运行标识。
- 正文按业务背景、一键对话、源码定位、Figma 转换组织，每项功能对应真实录屏。对话连接使用 CDP 与本机桥接，不误写为 CDN；目前仅描述 VS Code 的 Codex 插件支持。
- Figma 转换缘于 Axure 相关 MCP 工具较少；描述网页 DOM / 样式到可编辑设计内容的转换，不承诺恢复原始 Axure 组件、交互或设计系统。
- 保留公开安装页和源码链接；安装页路径为 `/AItool/`，GitHub 仓库为 `neo-jack/101my-agent`，本地目录名与仓库名不同。没有核验发布状态前，不把 npm 启动命令写成已可用入口。
- GIF 原图较大，替换或转码时须核对播放内容和清晰度，并同步正文引用；不要未经核对用静态帧代替演示。
