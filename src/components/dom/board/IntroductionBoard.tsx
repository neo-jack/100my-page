import assetHangingBoard from '../../../../public/textures/about/hanging-board.png?url';
import type { SyntheticEvent } from 'react';
import { reportStartupError } from '../../../utils/startup';

interface IntroductionBoardProps {
  onLoad: (event: SyntheticEvent<HTMLImageElement>) => void;
}

// 用两倍 CSS 尺寸绘制，配合入口 Html 的半尺寸缩放，保持墙面尺寸并改善透视合成清晰度。
export default function IntroductionBoard({ onLoad }: IntroductionBoardProps) {
  return (
    <div
      className="pointer-events-none relative aspect-3/2 w-175 max-[900px]:hidden"
      style={{ fontFamily: '"mono", "PingFang SC", "Microsoft YaHei", sans-serif' }}
      aria-label="作品集简介"
    >
      <div aria-hidden="true" className="absolute inset-x-[5.7%] top-[33.8%] bottom-[10.8%] rounded-[8px] bg-[#d0cecc]" />
      <picture>
        <source media="(min-width: 901px)" srcSet={assetHangingBoard} />
        <img
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          alt=""
          width={1536}
          height={1024}
          draggable={false}
          loading="eager"
          className="absolute inset-0 h-full w-full select-none object-contain grayscale"
          onLoad={onLoad}
          onError={() => reportStartupError(new Error('Failed to load the introduction board'))}
        />
      </picture>
      {/* 标题与方向列表单独绘制，不叠加亚像素阴影，避免细笔画出现重影。 */}
      <div className="absolute inset-x-[10%] top-[39%] bottom-[12%] flex flex-col items-center justify-center text-center text-[28px] font-normal leading-[1.35] text-[#41443f]">
        <h2 className="text-[1.15em] font-normal">个人作品集</h2>
        <ul className="mt-1 w-full list-none space-y-0.5 p-0">
          <li>- 3D网站 -</li>
          <li>- React源码核心 -</li>
          <li>- Ai工作流（像素化还原ui） -</li>
          <li>- 界面元素选择器 -</li>
        </ul>
      </div>
    </div>
  );
}
