## context

`context/` 保存当前场景和站点 UI 真正消费的共享状态；现有实现提供音效静音、音量偏好和背景音乐状态。

**Important:** `AudioProvider` 的偏好来自本地 `audio_muted` / `audio_volume`。背景音乐由 Provider 统一控制，不等同于全场景静音。

### Important files

- `AudioManager.tsx` — `AudioProvider` 和 `useAudio`，为 `TechStackBalloons` 的弹开音效提供静音/音量偏好，为 `SiteShell` 顶部音乐按钮及 S 快捷键提供 `bgmOn` / `toggleBgm`。

### Implementation notes

- Provider 在 `src/App.tsx` 挂载；新增共享字段或动作前先明确实际消费者，避免保留无读取方的状态。
- 背景音乐 URL 从 `public/bgm.mp3` 静态导入，构建后与其他音频一起使用内容哈希地址；播放音量在 `AudioManager.tsx` 中设为 `0.3`（30%），独立于场景音效的 `audio_volume` 偏好。
- 背景音乐由 Provider 统一创建和暂停，`SiteShell` 不单独维护 `Audio` 实例或开关状态；`HomePage` 的入口提示不提供声音控制。
- 清理源码不会删除用户本地存储中的历史偏好或成就记录。
