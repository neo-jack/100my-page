import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { recordScenePerformance, resetScenePerformanceWindow } from '../../utils/scenePerformance';

/** 页面隐藏、恢复时，统一管理场景时钟与 GSAP 动画的暂停和续播。 */
export default function SceneActivity({ ready }: { ready: boolean }) {
  const get = useThree((state) => state.get);

  useLayoutEffect(() => {
    // Warmup owns GPU preparation while the loading paper covers the scene.
    // Starting normal frames early can upload textures before staged warmup does.
    if (!ready) return;
    const { clock, advance } = get();
    let elapsed = clock.elapsedTime;
    let previousTime: number | undefined;
    let frame = 0;
    let inactive = false;
    let warmupFrames = 0;
    let ownsPause = false;
    let timelineWasPaused = false;

    const releaseTimeline = () => {
      if (!ownsPause) return;
      // 保持时间线暂停，先唤醒 GSAP 时钟，避免旧时间差推进刚点击触发的动画。
      gsap.ticker.wake();
      gsap.globalTimeline.paused(timelineWasPaused);
      ownsPause = false;
    };

    const render = (time: number) => {
      let delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      if (warmupFrames > 0) {
        delta = 0;
        if (--warmupFrames === 0) releaseTimeline();
      }
      elapsed += delta;
      frame = requestAnimationFrame(render);
      // R3F 的手动 advance 接收以秒为单位的时间，同时更新 delta 和 elapsedTime。
      advance(elapsed);
      const { gl, scene } = get();
      recordScenePerformance(time, gl, scene);
    };

    const suspend = () => {
      if (inactive) return;
      inactive = true;
      cancelAnimationFrame(frame);
      previousTime = undefined;
      resetScenePerformanceWindow();
      warmupFrames = 0;
      if (!ownsPause) {
        timelineWasPaused = gsap.globalTimeline.paused();
        gsap.globalTimeline.pause();
        ownsPause = true;
      }
    };

    const resume = () => {
      if (document.hidden || !inactive) return;
      // 恢复时仍接收点击，新动画加入暂停的时间线，待静止帧绘制后开始播放。
      // 不依赖固定延时，也不需要用户再次点击。
      inactive = false;
      warmupFrames = 2;
      frame = requestAnimationFrame(render);
    };
    const handleVisibility = () => document.hidden ? suspend() : resume();

    document.addEventListener('visibilitychange', handleVisibility);
    // 失焦不等于不可见：地址栏、开发工具或其他窗口获得焦点时仍须绘制首屏。
    // 否则预热和 DOM 揭幕继续执行，Canvas 却要等点击恢复焦点后才显示。
    window.addEventListener('focus', resume);
    window.addEventListener('pagehide', suspend);
    window.addEventListener('pageshow', resume);
    if (document.hidden) suspend();
    else frame = requestAnimationFrame(render);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', resume);
      window.removeEventListener('pagehide', suspend);
      window.removeEventListener('pageshow', resume);
      cancelAnimationFrame(frame);
      releaseTimeline();
    };
  }, [get, ready]);

  return null;
}
