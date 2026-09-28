import type { Ref } from 'react';
import assetFloorPaper from '../../../../public/textures/entrance/floor_paper.webp?url';

export default function FlightGestureHint({ ref }: { ref?: Ref<HTMLElement> }) {
  return (
    <aside
      ref={ref}
      className="pointer-events-none fixed bottom-8 left-1/2 z-30 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 px-7 py-3.5 text-center font-sans text-[0.975rem] leading-[1.35] text-[#3a3a36] drop-shadow-[0_4px_10px_rgba(0,0,0,0.15)]"
      aria-label="飞行操作提示"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        backgroundImage: `url("${assetFloorPaper}")`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        clipPath: 'polygon(0% 0%, 100% 0%, 98% 13%, 100% 25%, 97% 38%, 100% 50%, 98% 63%, 100% 78%, 97% 91%, 100% 100%, 88% 97%, 76% 100%, 64% 97%, 52% 100%, 40% 97%, 28% 100%, 16% 97%, 0% 100%, 2% 88%, 0% 75%, 3% 62%, 0% 49%, 2% 36%, 0% 23%, 3% 10%)',
      }}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M 0 0 L 100 0 L 98 13 L 100 25 L 97 38 L 100 50 L 98 63 L 100 78 L 97 91 L 100 100 L 88 97 L 76 100 L 64 97 L 52 100 L 40 97 L 28 100 L 16 97 L 0 100 L 2 88 L 0 75 L 3 62 L 0 49 L 2 36 L 0 23 L 3 10 L 0 0 Z"
          fill="none"
          stroke="rgba(26, 26, 26, 0.7)"
          strokeWidth="0.55"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="relative z-1 block font-sans text-[1.0875rem] font-bold uppercase tracking-[0.04em] text-[#1a1a1a]">
        飞行
      </span>
      <span className="relative z-1 block">
        滚动鼠标滚轮，向前或向后飞行
      </span>
    </aside>
  );
}
