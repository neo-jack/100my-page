import { useSyncExternalStore } from 'react';
import { getScenePerformance, subscribeScenePerformance } from '../../utils/scenePerformance';

export default function PerformancePanel() {
  const metrics = useSyncExternalStore(subscribeScenePerformance, getScenePerformance);
  return (
    <dl id="scene-performance-panel" aria-label="性能调试" className="pointer-events-auto fixed right-16 top-22 z-30 grid w-64 grid-cols-[1fr_auto] gap-x-5 gap-y-2 border border-black/15 bg-[#fbfaf4]/95 px-4 py-3 font-sans text-xs leading-5 text-[#333] shadow-sm max-[901px]:right-6 max-[901px]:top-23">
      <dt>帧率 FPS</dt>
      <dd className="m-0 font-mono tabular-nums">{metrics?.fps ?? '—'}</dd>
      <dt>绘制</dt>
      <dd className="m-0 font-mono tabular-nums">{metrics?.calls ?? '—'}</dd>
      <dt title="场景引用的纹理容量估算，含 mipmap；不含几何体、帧缓冲或驱动开销，并非总显存。">纹理</dt>
      <dd className="m-0 whitespace-nowrap font-mono tabular-nums">{metrics?.textureMiB == null ? '—' : `${metrics.textureMiB.toFixed(1)} MiB`}</dd>
    </dl>
  );
}
