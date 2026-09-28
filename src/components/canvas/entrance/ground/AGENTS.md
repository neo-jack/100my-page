## ground

门前石板路的坐标收拢与透明边缘处理；地面和路面仍由 ../door/EntranceDoors.tsx 挂载。

**Important:** 只生成运行时派生几何和纹理，不能为收拢或柔化边缘改写源图。

### Important files

- `pavingSurface.ts` — 旧路面图的横向收拢映射与运行时边缘柔化；几何和透明过渡共享场景坐标，源图不改写。

### Implementation notes

- 入口地面和石头路由 `../door/EntranceDoors.tsx` 负责；替换入口组件时保持地面、门体和门洞处在同一场景关系中。
- 石板路后沿 `pathStartZ=doorFrontZ` 接关闭门扇的正面下沿，门扇、门框下沿与路面共用 `floorY=groundY+0.005`，其中 groundY=-2；只保留防止地面重叠闪烁的微小偏移，不再悬高 0.25 世界单位。保留 630px 自然路面贴图，以入口不透明范围 `[98/630,478/630]` 求门口配准宽度与中心。`pathGeometry` 使用横向 128 段平面：门洞宽度内保持原映射，外侧按指数曲线平滑收拢至两花坛内沿各留 0.25 世界单位的界限，保留完整 UV 和透明轮廓。界限从 `planterColliders` 推导，不通过重绘/硬裁边或整体缩窄破坏门口衔接；构造后更新位置属性和包围体，卸载释放几何。
- 路面两侧透明过渡由 `pavingSurface.ts` 按 alpha≥240 的石板边界生成：纵向 11 行加权平滑轮廓，左右均按收拢后的场景距离在边界内外各 0.025 单位做 smoothstep，而不是使用相同贴图像素数；入口与末端 48 行渐退该处理。只减小外围 alpha，保留石内 RGB 和原图文件；完全透明像素以纸灰 225 补色，避免 mipmap 产生黑边。
- 派生路面 `DataTexture` 明确使用 sRGB、线性 mipmap 和硬件允许的各向异性采样；Canvas 读出的顶行数据先翻转到 DataTexture 的底行顺序，保持 `flipY=false`，防止路面首尾倒置。派生纹理按来源和布局缓存并参与首屏预热，几何与纹理各自清理，不逐帧重建，也不释放 useTexture 共享源图。

- 基础地面后沿止于墙正面 wallThickness/2，石板路后沿止于关闭门扇正面 pathStartZ；基础地面中心由 wallThickness/2+groundLength/2 计算，既接住两侧墙脚，又不向门后 z<0 越界。不能再用 pathLength/2 计算中心。验证开门过程与完全打开时，门洞内没有多出的地面横条。
