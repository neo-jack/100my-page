# page3d

使用 React、TypeScript 和 Three.js 构建的 3D 个人主页，包括纸艺入口、场景交互、作品展示与 AI 向导。

AI 向导通过独立的 [aiPet](https://github.com/neo-jack/aiPet) 组件包接入，页面负责场景与交互。

## 在线体验

[打开 3D 个人主页](https://www.lanbinquan.top/)

## 快速开始

建议使用 Node.js 24。

```bash
git clone https://github.com/neo-jack/page3d.git
cd page3d
npm ci
npm run dev
```

站点与监控地址在 `site.config.json` 中配置。接入自己的 AI 服务时，复制 `.env.example` 为 `.env.local`，设置 `VITE_AI_ENDPOINT`；服务端同时配置允许访问的网页域名。

## 构建与验证

在仓库根目录执行：

```bash
# 检查 TypeScript 类型
npx tsc --noEmit

# 验证内容编译、发布边界与聊天协议
node --test build/notes.test.js build/productionBoundary.test.js build/aiChat.test.mjs build/siteCards.test.mjs

# 生成生产构建并检查发布资源
npm run build
node build/auditAssetRelease.js dist
```
