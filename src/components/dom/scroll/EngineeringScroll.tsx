import assetHangingScroll from '../../../../public/textures/engineering/hanging-scroll.svg?url';
import { useRef, type SyntheticEvent } from 'react';
import EngineeringNotes from './EngineeringNotes.tsx';
import { reportStartupError } from '../../../utils/startup.ts';

const SCROLL_TEXTURE = assetHangingScroll;
const EMPTY_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

interface Props {
  onLoad: (event: SyntheticEvent<HTMLImageElement>) => void;
  expanded: boolean;
  interactive: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

export default function EngineeringScroll({ onLoad, expanded, interactive, onExpandedChange: setExpanded }: Props) {
  const toggle = useRef<HTMLButtonElement>(null);

  return (
    <section
      className="engineering-scroll pointer-events-none relative w-(--scroll-width) -translate-x-1/2 text-[#41443f] max-[900px]:hidden"
      style={{ fontFamily: '"tiktok", "PingFang SC", "Microsoft YaHei", sans-serif' }}
      data-expanded={expanded} aria-label="前端工程手记" inert={!interactive}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
        setExpanded(false);
        toggle.current?.focus({ preventScroll: true });
      }}>
      {/* 与装饰层共用同一资源，解码完成后才允许首屏揭幕；窄屏不请求卷轴。 */}
      <picture className="hidden" aria-hidden="true">
        <source media="(max-width: 900px)" srcSet={EMPTY_IMAGE} />
        <img src={SCROLL_TEXTURE} alt="" onLoad={onLoad} onError={reportStartupError} />
      </picture>
      <div className="engineering-scroll__art absolute inset-0 border-solid border-transparent" aria-hidden="true"
        style={{
          borderWidth: 'calc(var(--scroll-width) * 0.07227) calc(var(--scroll-width) * 0.098) calc(var(--scroll-width) * 0.176)',
          borderImage: `url('${SCROLL_TEXTURE}') 74 100 180 100 fill / 1 / 0 stretch`,
          filter: 'grayscale(1) brightness(1.04) drop-shadow(1px 2px 1px rgb(38 39 33 / 8%))',
        }} />
      <div className="engineering-scroll__paper relative border-solid border-transparent"
        style={{ borderWidth: 'calc(var(--scroll-width) * 0.07227) calc(var(--scroll-width) * 0.098) calc(var(--scroll-width) * 0.176)' }}>
        <header>
          <h2>
            {/* 收起时伪元素覆盖整幅卷轴，展开后仅标题按钮可收起。 */}
            <button ref={toggle} type="button"
              className={[
                'engineering-scroll__toggle pointer-events-auto flex min-h-[calc(var(--scroll-width)*0.2)] w-full cursor-pointer flex-col items-center justify-center px-0 py-[calc(var(--scroll-width)*0.04)] outline-offset-4 focus-visible:[outline:2px_dotted_#52574b]',
                expanded ? '' : "before:absolute before:inset-[calc(var(--scroll-width)*-0.07227)_calc(var(--scroll-width)*-0.098)_calc(var(--scroll-width)*-0.176)] before:content-['']",
              ].join(' ')}
              aria-expanded={expanded} aria-controls="engineering-scroll-content"
              aria-label={expanded ? '收起工程手记' : '展开工程手记'}
              onClick={() => setExpanded(!expanded)}>
              <span className="engineering-scroll__title text-[calc(var(--scroll-width)*0.07)] font-semibold leading-[1.4]">3D 前端工程设计</span>
            </button>
          </h2>
        </header>
        <div id="engineering-scroll-content"
          className={[
            'engineering-scroll__reveal grid [transition:grid-template-rows_850ms_cubic-bezier(0.22,0.75,0.18,1),visibility_850ms] motion-reduce:transition-none',
            expanded ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]',
          ].join(' ')}
          inert={!expanded} aria-hidden={!expanded}>
          <div className="engineering-scroll__clip min-h-0 overflow-hidden">
            <div className={[
              'engineering-scroll__content mx-1 mt-1 border-t border-dashed border-[rgb(79_81_70/24%)] px-0.5 pt-2 pb-2 transition-opacity duration-180 ease-[ease] motion-reduce:transition-none',
              expanded ? 'opacity-100 delay-160' : 'opacity-0',
            ].join(' ')}>
              <EngineeringNotes />
              <p className="mt-3 text-right text-[calc(var(--scroll-width)*0.055)] font-normal leading-[1.6] text-[#696b62]">点击条目查看优化详情</p>
            </div>
          </div>
        </div>
      </div>
      <button type="button"
        className="engineering-scroll__bottom-toggle pointer-events-auto absolute inset-x-[calc(var(--scroll-width)*0.035)] bottom-[calc(var(--scroll-width)*0.035)] flex h-[calc(var(--scroll-width)*0.14)] cursor-pointer items-center justify-center text-[#52574b] outline-offset-2 focus-visible:[outline:2px_dotted_#52574b]"
        aria-label={expanded ? '点击卷轴底部收起' : '点击卷轴底部展开'}
        aria-controls="engineering-scroll-content" aria-expanded={expanded}
        onClick={() => {
          setExpanded(!expanded);
          if (expanded) toggle.current?.focus({ preventScroll: true });
        }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
          className={[
            'size-4 transition-transform duration-200 motion-reduce:transition-none',
            expanded ? 'rotate-180' : 'rotate-0',
          ].join(' ')}>
          <path d="m5 9 7 7 7-7" />
        </svg>
      </button>
    </section>
  );
}
