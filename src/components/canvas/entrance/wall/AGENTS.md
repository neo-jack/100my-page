## wall

围绕门洞的左右墙板和顶板，尺寸由入口门组件传入。

**Important:** 墙板必须保留真实门洞，并复用入口的门洞宽高和纸纹约定。

### Important files

- `EntranceWall.tsx` — 由左右墙板和顶板组成的门洞围护结构。

### Implementation notes

- `EntranceWall.tsx` 使用三块几何体围出空门洞，尺寸由入口 props 推导，并与门框保持同一门洞宽高来源。

- 使用 imgaier 生成的独立 `wall-paper.webp` 浅灰白石砖纸感纹理，按每 2.5 世界单位平铺；左右墙与顶墙分别克隆并以世界坐标计算 offset，保持墙板正面的纹理连续。颜色图使用 sRGB，各向异性上限 8；卸载仅释放克隆，不释放缓存。保持三块不透明墙板与真实门洞。
