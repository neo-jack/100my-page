import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAudio } from '../../context/AudioManager.tsx';
import { LEGACY_SITE_URL } from '../../data/site.ts';
import PerformancePanel from './PerformancePanel';

type SiteShellProps = {
  children: ReactNode;
  onReturnHome?: () => void;
};

const hoverFrameClass = [
  'relative',
  "after:absolute after:inset-[-0.35rem] after:content-['']",
  'after:border-2 after:border-dotted after:border-transparent',
  'hover:after:border-l1 focus-visible:after:border-l1 focus-visible:outline-none',
].join(' ');

const navButtonClass = [
  hoverFrameClass,
  'pointer-events-auto cursor-pointer px-1 py-1 text-left uppercase no-underline',
  'max-[901px]:flex max-[901px]:min-h-11 max-[901px]:items-center max-[901px]:px-2 max-[901px]:py-2',
].join(' ');

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function SiteShell({ children, onReturnHome }: SiteShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const brandRef = useRef<HTMLSpanElement>(null);
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const { bgmOn, toggleBgm } = useAudio();

  const panelBackground = 'rgba(251, 250, 244, 0.92)';

  useEffect(() => {
    // 壳层快捷键：背景音乐控制
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === 's') toggleBgm();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleBgm]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 901px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [menuOpen]);

  // 桌面端直接显示导航，移动端复用同一组按钮放入折叠菜单。
  const nav = (
    <>
      <button className={[navButtonClass, 'normal-case'].join(' ')} type="button" aria-pressed={bgmOn} onClick={toggleBgm}>
        音乐[{bgmOn ? '|' : '/'}]
      </button>
      <button className={navButtonClass} type="button" aria-expanded={performanceOpen}
        aria-controls="scene-performance-panel" onClick={() => {
          setPerformanceOpen((open) => !open);
          if (menuOpen) menuButtonRef.current?.focus();
          setMenuOpen(false);
        }}>
        性能[{performanceOpen ? '|' : '/'}]
      </button>
      <a className={[navButtonClass, 'normal-case'].join(' ')} href={LEGACY_SITE_URL} onClick={() => setMenuOpen(false)}>
        旧版[/]
      </a>
      {onReturnHome && (
        <button
          className={navButtonClass}
          type="button"
          onClick={() => {
            onReturnHome();
            setMenuOpen(false);
            scrollRootRef.current?.scrollTo({ top: 0, behavior: 'instant' });
            const focusTarget = window.matchMedia('(min-width: 901px)').matches ? brandRef.current : menuButtonRef.current;
            focusTarget?.focus({ preventScroll: true });
          }}
        >
          返回[/]
        </button>
      )}
    </>
  );

  return (
    <>
      <header
        className={[
          'fixed inset-x-0 top-0 z-40 flex items-start justify-between px-16 py-10',
          'pointer-events-none font-display text-base font-normal leading-none text-(--shell-foreground) transition-colors duration-150',
          'max-[901px]:items-center max-[901px]:px-6 max-[901px]:py-6 max-[901px]:text-[0.96rem]',
        ].join(' ')}
      >
        <span ref={brandRef} tabIndex={-1} className="font-sans font-extrabold uppercase outline-none max-[901px]:text-[1.75rem] max-[901px]:leading-none">
          LBQ.WORKS
        </span>
        <nav className="hidden items-center gap-10 min-[901px]:flex" aria-label="Primary">
          {nav}
        </nav>
        <div
          ref={menuRef}
          className="relative shrink-0 min-[901px]:hidden"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
          }}
        >
          <button
            ref={menuButtonRef}
            className="pointer-events-auto relative block h-11 w-11 cursor-pointer p-0 focus-visible:outline-2 focus-visible:outline-dotted focus-visible:outline-offset-4"
            type="button"
            aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <span
                className={cx(
                  'absolute h-0.5 w-6 bg-current transition-transform duration-180 motion-reduce:transition-none',
                  menuOpen ? 'rotate-45' : '-translate-y-1.75',
                )}
              />
              <span
                className={cx(
                  'absolute h-0.5 w-6 bg-current transition-opacity duration-180 motion-reduce:transition-none',
                  menuOpen && 'opacity-0',
                )}
              />
              <span
                className={cx(
                  'absolute h-0.5 w-6 bg-current transition-transform duration-180 motion-reduce:transition-none',
                  menuOpen ? '-rotate-45' : 'translate-y-1.75',
                )}
              />
            </span>
          </button>

          {/* 菜单锚定触发按钮，跟随顶部栏的位置与尺寸。 */}
          {menuOpen && (
            <nav
              id="mobile-navigation"
              className="pointer-events-auto absolute right-0 top-full mt-3 flex max-h-[calc(100dvh-7rem)] w-48 max-w-[calc(100vw-3rem)] flex-col gap-1 overflow-y-auto border border-line p-3 font-display text-base leading-normal backdrop-blur-[14px]"
              style={{ backgroundColor: panelBackground }}
              aria-label="移动端导航"
            >
              {nav}
            </nav>
          )}
        </div>
      </header>
      {performanceOpen && <PerformancePanel />}

      <div ref={scrollRootRef} className="site-scroll-root relative h-screen overflow-y-auto overflow-x-hidden overscroll-y-contain scrollbar-none [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </>
  );
}
