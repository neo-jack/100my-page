import '@my-page/ai-pet/style.css';
import assetAppleIcon from '../public/apple-icon.png?url';
import assetIcon from '../public/icon.svg?url';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { extend } from '@react-three/fiber';
import { HomePage } from './components/dom/home/HomePage.tsx';
import { AudioProvider } from './context/AudioManager.tsx';
import { RevealBasicMaterial } from './shaders/RevealBasicMaterial';
import './global.css';
import { reportStartupError } from './utils/startup.ts';

// 在渲染前注册自定义材质，让 React Three Fiber 能在 JSX 中识别对应的材质标签。
extend({ RevealBasicMaterial });

// 文本元信息由构建插件写入 HTML；此处仅复用站点图标。
function setupDocumentMetadata() {
  // 浏览器使用可缩放的 SVG 图标；缓存版本由构建内容哈希生成。
  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    ?? document.createElement('link');
  favicon.rel = 'icon';
  favicon.sizes = 'any';
  favicon.type = 'image/svg+xml';
  favicon.href = assetIcon;
  favicon.dataset.appFavicon = 'true';
  if (!favicon.parentNode) document.head.appendChild(favicon);

  // 添加到 Apple 设备主屏幕时使用 PNG 图标，声明尺寸需与实际图片一致。
  const appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
    ?? document.createElement('link');
  appleIcon.rel = 'apple-touch-icon';
  appleIcon.sizes = '512x512';
  appleIcon.type = 'image/png';
  appleIcon.href = assetAppleIcon;
  appleIcon.dataset.appAppleIcon = 'true';
  if (!appleIcon.parentNode) document.head.appendChild(appleIcon);
}

// 获取 index.html 提供的挂载容器，容器缺失时提前报错，避免继续初始化。
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found.');
}

// 元信息独立于 React 组件树，在页面挂载前完成设置。
setupDocumentMetadata();

// 组件树直接挂载到根节点；StrictMode 在开发环境帮助检查渲染和副作用问题。
createRoot(rootElement, { onUncaughtError: reportStartupError }).render(
  <StrictMode>
    {/* 为气球音效提供静音和音量偏好。 */}
    <AudioProvider>
      {/* 首页协调站点外壳、Three.js 场景和返回入口状态。 */}
      <HomePage />
    </AudioProvider>
  </StrictMode>,
);
