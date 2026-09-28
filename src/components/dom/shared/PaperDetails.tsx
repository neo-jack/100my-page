import assetPaperTexture from '../../../../public/textures/paper-texture.webp?url';
import { useEffect, useRef } from 'react';
import NoteMarkdown from './NoteMarkdown';

const PAPER_EDGE = 'polygon(0% 1%,4% 0%,8% 1%,12% 0%,16% 1%,20% 0%,24% 1%,28% 0%,32% 1%,36% 0%,40% 1%,44% 0%,48% 1%,52% 0%,56% 1%,60% 0%,64% 1%,68% 0%,72% 1%,76% 0%,80% 1%,84% 0%,88% 1%,92% 0%,96% 1%,100% 0%,99% 5%,100% 10%,99% 15%,100% 20%,99% 25%,100% 30%,99% 35%,100% 40%,99% 45%,100% 50%,99% 55%,100% 60%,99% 65%,100% 70%,99% 75%,100% 80%,99% 85%,100% 90%,99% 95%,100% 100%,96% 99%,92% 100%,88% 99%,84% 100%,80% 99%,76% 100%,72% 99%,68% 100%,64% 99%,60% 100%,56% 99%,52% 100%,48% 99%,44% 100%,40% 99%,36% 100%,32% 99%,28% 100%,24% 99%,20% 100%,16% 99%,12% 100%,8% 99%,4% 100%,0% 99%,1% 95%,0% 90%,1% 85%,0% 80%,1% 75%,0% 70%,1% 65%,0% 60%,1% 55%,0% 50%,1% 45%,0% 40%,1% 35%,0% 30%,1% 25%,0% 20%,1% 15%,0% 10%,1% 5%)';

export interface PaperDetailsContent {
  id: string;
  title: string;
  body: string;
}

interface Props {
  content: PaperDetailsContent;
  open: boolean;
  visible: boolean;
  placement: 'center';
  onClose: () => void;
}

export default function PaperDetails({ content, open, visible, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element || !visible || !open) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    closeButton.current?.focus({ preventScroll: true });
    const entrance = element.querySelector('article')?.animate(
      [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450, easing: 'ease-out' },
    );
    return () => {
      entrance?.cancel();
      element.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open, visible]);

  if (!visible) return null;

  return (
    <dialog ref={dialog} aria-labelledby={`paper-title-${content.id}`}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="pointer-events-auto fixed inset-0 z-40 m-0 h-dvh max-h-none w-screen max-w-none items-center justify-center overflow-hidden border-0 bg-transparent p-4 font-sans text-base font-normal leading-normal text-[#363d34] outline-none open:flex backdrop:bg-[rgba(35,40,34,0.13)]">
      <article onClick={(event) => event.stopPropagation()}
        className="flex max-h-[calc(100dvh-3rem)] w-full max-w-160 flex-col bg-[#faf9f2] px-[clamp(1.5rem,3.5vw,3.5rem)] py-[clamp(1.5rem,4vh,3rem)] shadow-xl max-md:px-7 max-md:py-6"
        style={{ clipPath: PAPER_EDGE, backgroundImage: `url("${assetPaperTexture}")`, backgroundSize: 'cover' }}>
        <header className="mb-5 flex shrink-0 items-start justify-between gap-4">
          <h2 id={`paper-title-${content.id}`} className="min-w-0 text-[clamp(1.3rem,2.3vw,2.2rem)] font-bold leading-snug tracking-tight">{content.title}</h2>
          <button ref={closeButton} type="button" aria-label="关闭详情" onClick={onClose}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center outline-2 outline-offset-2 outline-[#363d34] hover:bg-[#363d34]/5 focus-visible:outline-offset-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m4 4 12 12M16 4 4 16" /></svg>
          </button>
        </header>
        <div tabIndex={0} aria-label="优化内容" className="min-h-0 overflow-y-auto overscroll-contain border-t border-dashed border-[#aaa99c] pt-5 text-sm leading-[1.85] outline-offset-2 focus-visible:outline-1 max-md:pt-3 max-md:text-xs">
          <NoteMarkdown body={content.body} />
        </div>
      </article>
    </dialog>
  );
}
