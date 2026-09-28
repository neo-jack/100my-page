## engineering

`engineering/` 保存首屏工程手记的悬挂卷轴纹理，由 `src/components/dom/scroll/EngineeringScroll.tsx` 的图片预加载与装饰层 `style.borderImage` 共用。

**Important:** 卷轴按九宫格渲染，上下卷轴保持比例，不包含挂绳，只有中央纸面随内容伸长。更换图片时同时更新 CSS 切片和边框宽度，不能直接拉伸整幅图。

### Important files

- `hanging-scroll.svg` — 1024×1310 的透明卷轴组合资源，viewBox 为 `0 226 1024 1310`；卷轴轮廓为手写 SVG，挂绳图层已删除，纸面材质裁自现有 imgaier 生成的 `../about/hanging-board.png`。图片不含烘焙文字，文案由 DOM 承载。

### Implementation notes

- SVG 内嵌的 WebP 数据用于让图片上下文中的 SVG 独立渲染，避免外链图片被浏览器拦截；更新纸纹源文件不会自动同步内嵌数据。
- 纸纹裁取挂板的 `(256, 400) → (1280, 900)` 留白区域并缩至 512×250，避开边框与挂绳；正文区域使用灰色底与低对比纸纹，卷边使用哑光渐变，不能恢复亮白高光和光滑塑料质感。
- `border-image-slice` 为 `74 100 180 100 fill`；对应顶部、侧边和底部 CSS 宽度分别为整体宽度的 `0.07227`、`0.098` 和 `0.176`。
- 纸面 DOM 文字保持独立可访问，动态效果由组件 CSS 维护；图片仅作为装饰，初次解码参与页面加载就绪条件。
- 装饰层的灰度、亮度和轻微投影直接在 `EngineeringScroll.tsx` 对应元素的 `style` 中维护，布局和交互样式使用元素上的 Tailwind `className`，具体参数见 `src/components/dom/scroll/AGENTS.md`；纸面底色不透明，装饰层保持 opacity=1，不再透出墙纹；不要把滤镜放到包含文字或 dialog 的共同祖先上。组件整体不使用旋转、悬停摇摆或位移效果。
