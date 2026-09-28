## sounds

本目录保存气球单次爆破声与已停用的云层风声源文件；浏览器使用静态 `?url` 导入，构建只发布实际引用的音频。

**Important:** 音效替换使用新的录音或合成来源；来源清单仅供构建检查，不能导入浏览器。公开署名集中在 `../THIRD-PARTY-NOTICES.txt`。

### Important files

- `sky-wind.mp3` — 已停用且不发布；保留 Luke.RUSTLTD 的 CC0 `wind1` 源文件与指纹，10.5 秒单声道循环，已交叉淡化接缝并匹配原风声 RMS。
- `paper-pop.mp3` — Gniffelbaf / AntumDeluge 的 CC0 气球爆破声，约 0.55 秒；按原单次音效能量调整电平。
- `sources.json` — 来源页面、下载 URL、许可、处理方式和当前文件指纹；不发布。

### Implementation notes

- `TechStackBalloons.tsx` 播放单次爆破声，保留 AudioProvider 的静音控制、现有空间衰减与挂载时加载；`AboutRoom.tsx` 不再导入或播放风声。
- `sources.json` 的 `publish: false` 表示音频保留在本地且继续校验指纹，但不得进入发布包；未设置该字段的音效仍须通过发布存在性检查。
- 更新音频时同步维护 `sources.json`、消费者静态导入和公开来源说明；避免恢复已替换文件或引入未引用的音频副本。
- 在项目根运行 `node build/assetIntegrity.js` 验证图片与音频指纹；发布审计检查启用音效存在，停用音效未进入构建。另在浏览器验证开屏与飞行时无风声、气球解码、静音偏好和连续弹破。
