import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function NoteImage({ src, alt = '', title }: { src: string; alt?: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const [originalSize, setOriginalSize] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    if (!element) return;
    const button = trigger.current;
    element.showModal();
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      if (button?.isConnected) button.focus({ preventScroll: true });
    };
  }, [open]);

  return <>
    <button ref={trigger} type="button" aria-label={`放大图片：${alt || '文章配图'}`} aria-haspopup="dialog"
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOriginalSize(false); setOpen(true); }}
      className="my-4 inline-block max-w-full cursor-zoom-in rounded-lg border-0 bg-transparent p-0 align-middle focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#62675a]">
      <img src={src} alt={alt} title={title} loading="lazy" decoding="async" className="block h-auto max-w-full rounded-lg" />
    </button>
    {open && createPortal(
      <dialog ref={dialog} aria-label={alt ? `图片预览：${alt}` : '图片预览'}
        onCancel={(event) => { event.preventDefault(); event.stopPropagation(); setOpen(false); }}
        onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) setOpen(false); }}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none flex-col overflow-hidden border-0 bg-black/90 p-3 font-sans text-white outline-none open:flex backdrop:bg-black/70 sm:p-6">
        <header className="mb-3 flex shrink-0 items-center justify-end gap-3">
          <span className="mr-auto min-w-0 truncate text-sm text-white/80">{alt || '图片预览'}</span>
          <button type="button" aria-pressed={originalSize} onClick={() => setOriginalSize(value => !value)}
            className="min-h-11 shrink-0 cursor-pointer rounded-lg px-3 text-sm hover:bg-white/15 focus-visible:outline-2">
            {originalSize ? '适应屏幕' : '查看原图'}
          </button>
          <button ref={closeButton} type="button" aria-label="关闭图片预览" onClick={() => setOpen(false)}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-white/15 focus-visible:outline-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <div tabIndex={0} aria-label="放大图片区域"
          onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
          className="flex min-h-0 flex-1 overflow-auto overscroll-contain focus-visible:outline-2">
          <img src={src} alt={alt} decoding="async" draggable={false}
            className={originalSize ? 'm-auto h-auto max-w-none shrink-0 self-start' : 'm-auto max-h-full max-w-full object-contain'} />
        </div>
      </dialog>, document.body,
    )}
  </>;
}
