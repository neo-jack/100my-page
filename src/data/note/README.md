# 笔记与作品

工程笔记和作品介绍统一放在这里。每篇一个 Markdown 文件，推荐每篇使用独立目录，图片和视频与正文放在一起：

```text
note/
  B2cdn/
    index.md
    images/
      overview.png
    videos/
      demo.mp4
  A1react/
    index.md
    cover.webp
```

目录中的内容 Markdown 自动收录，无需修改 TypeScript 数组。也可以直接使用 `note/my-note.md`。`README.md`、`AGENTS.md`、隐藏文件夹不会成为笔记。开发时增删或编辑笔记、修改 `catalog.json` 会刷新页面，线上内容在重新构建、发布后更新。

每篇头部只保留 `title`，其余内容直接写在正文中。详情顶部显示标题与关闭按钮，不显示编号、分类、摘要栏、技术标签或固定底部按钮；需要外链时在正文中使用普通 Markdown 链接。

## 预览按钮

所有笔记共用手绘双线边框按钮。仅包含链接的段落会自动成为按钮组，文字可自由填写，无需标记。多个链接连续换行，中间不插空行，按钮之间固定相差 4px：

```markdown
[线上在线预览](https://www.lanbinquan.top/React/)
[github仓库](https://github.com/你的账号/你的仓库)
```

可继续追加任意数量的链接，单个链接也使用按钮样式；换行与尾随空白（包括 `&#x20;`）不会额外撑大间距。示例地址需替换为真实地址。兼容旧的 `"preview"` 标记，以及以“在线预览”“预览”或“探索作品”开头（后接冒号、空白或结束）的自动识别。按钮在新标签页打开，支持键盘聚焦；混合在普通正文中的其他链接保持正文样式。尚无真实地址时不添加按钮。

## 新增工程笔记

新建 `my-note/index.md`，复制以下内容并修改：

```markdown
---
title: 我的工程笔记
---

## 背景

这里写正文，支持 **加粗**、列表、引用、代码块、表格和任务清单。

## 图片

![方案示意图](./images/overview.png)

## 视频

![操作演示](./videos/demo.mp4)
```

相对路径从当前 `.md` 所在目录计算，请同时放入引用的文件。图片支持 PNG、JPEG、WebP、SVG、GIF、AVIF；视频使用同样的 `![]()` 语法，播放器自动提供控制条，不自动播放，推荐浏览器兼容性较好的 MP4 / WebM。MOV / OGG 能否播放取决于浏览器和视频编码。也支持 HTTP(S) 图片/视频地址、Markdown 引用式图片和普通链接。

不解析原始 HTML；请使用 Markdown 图片语法嵌入视频。未引用的附件不会打包；笔记附件直接使用 Vite 哈希地址，不需要填写 `build/assetBaseline.json`。

## 新增作品

正文写法与工程笔记相同，头部仍然只保留标题：

```yaml
title: 我的作品
```

在 `catalog.json` 中以笔记 ID 为键配置场景信息，作品便会加入门后的卡片队列。例如 `my-project/index.md` 对应：

```json
{
  "my-project": {
    "kind": "portfolio",
    "order": 4,
    "cover": "./cover.webp",
    "balloons": ["react", "javascript", "git"]
  }
}
```

`cover` 相对于这篇 Markdown 解析，是 3D 卡面的本地图片，建议约 13:17、包含卡面文字和探索入口。现有三张卡面继续引用 `public/textures/portfolio/` 共享素材；新作品可把封面直接放在自己的目录。`balloons` 可使用 `react`、`javascript`、`git`、`figma`、`html`、`css`，可省略。卡面文字烘焙在图片内，修改卡面文案时需要同步更新封面；原有三张卡面的按钮位置由 Canvas 单独校正。

工程笔记可在 `catalog.json` 中配置 `{"kind": "engineering", "order": 7}`；未配置的笔记默认作为工程笔记排在已配置条目之后，同序号按 ID 排序。封面与气球配置仅服务于 3D 场景，不显示成详情分类或标签。

## 独立入口内容

只从特定入口打开的说明同样放在独立目录，例如 `C1chat/index.md`，并在 catalog 配置 `{"kind": "standalone"}`。此类内容进入 `NOTES`，组件按 ID 读取，但不会加入工程卷轴或作品卡片；无需封面。首页纸条的 AI 对话架构说明使用这种方式，标题与正文不在组件中重复维护。

## 头部规则

- 头部仅允许必填的非空 `title`；正文不能为空。
- `id` 取文件名；`index.md` 取所在目录名。使用英文字母、数字和短横线，区分大小写且全目录唯一；目录按 A（作品）、B（工程）、C（独立说明）加序号与英文主题命名，例如 A1react、B1mechanism、C1chat。重命名目录时同步修改 `catalog.json` 的键。
- `kind`、正整数 `order`、作品必填 `cover` 与可选 `balloons` 只在 `catalog.json` 配置，不放入 Markdown 头部。
- 按 `order` 从小到大展示，同序号按 ID 排序；工程笔记和作品各自展示。删除内容时同步移除其场景配置。
- `---` 之间是标准 YAML，复杂文本可以加引号，多行文本使用 `|`。
- 缺少附件、重复 ID、非法场景类型或额外头部字段会在开发/构建时提示对应文件，避免发布坏卡片。
