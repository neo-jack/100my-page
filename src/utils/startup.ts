type Stage = 'assets' | 'fonts' | 'scene';

const stages: Record<Stage, number> = { assets: 0, fonts: 0, scene: 0 };
let progress = 0;
let failed = false;
let finished = false;
let completion: Promise<void> | undefined;

const getLoader = () => document.getElementById('startup-loader');

function paintProgress(next: number) {
  const nextProgress = Math.max(progress, Math.min(100, Math.floor(next)));
  if (nextProgress === progress) return;
  progress = nextProgress;
  document.querySelectorAll<SVGElement>('.startup-tear').forEach((element) => {
    element.style.setProperty('--load-offset', `${100 - progress}%`);
  });
  document.getElementById('startup-progress')?.setAttribute('aria-valuenow', String(progress));
  document.querySelectorAll('[data-loading-percent]').forEach((element) => {
    element.textContent = `${progress}%`;
  });
}

export function startStartup() {
  paintProgress(1);
}

// Task-weighted progress: downloads, DOM fonts, then text/texture/GPU preparation.
// A finished network batch can never release the loading screen by itself.
export function setStartupProgress(stage: Stage, value: number) {
  if (failed || finished) return;
  stages[stage] = Math.max(stages[stage], Math.min(1, value));
  paintProgress(1 + stages.assets * 79 + stages.fonts * 5 + stages.scene * 14);
}

export function reportStartupError(error: unknown) {
  if (finished || failed) return;
  failed = true;
  const loader = getLoader();
  if (loader) loader.dataset.state = 'error';
  console.error('Unable to prepare the scene:', error);
}

export function revealStartup(): Promise<void> {
  if (completion) return completion;
  completion = (async () => {
    if (failed) throw new Error('Scene startup failed');
    const loader = getLoader();
    paintProgress(100);
    if (loader) {
      loader.dataset.state = 'revealing';
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const animations = Array.from(loader.querySelectorAll<HTMLElement>('.startup-paper')).map((paper, index) =>
        paper.animate(
          reducedMotion
            ? [{ opacity: 1 }, { opacity: 0 }]
            : [{ transform: 'translateX(0) rotate(0)' }, { transform: `translateX(${index === 0 ? '-102%' : '102%'}) rotate(${index === 0 ? '-2deg' : '2deg'})` }],
          { duration: reducedMotion ? 120 : 1100, delay: reducedMotion ? 0 : 180, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' },
        ),
      );
      await Promise.all(animations.map((animation) => animation.finished));
      if (failed) {
        animations.forEach((animation) => animation.cancel());
        throw new Error('Scene startup failed');
      }
      loader.remove();
    }
    finished = true;
    const root = document.getElementById('root');
    if (root) {
      root.inert = false;
      root.setAttribute('aria-busy', 'false');
    }
  })();
  return completion;
}
