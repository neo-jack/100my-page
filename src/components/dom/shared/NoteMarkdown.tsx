import Markdown, { defaultUrlTransform, type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createContext, useContext } from 'react';
import previewButton from '../../../../public/textures/portfolio/preview-button.webp?url';
import NoteImage from './NoteImage';

const LinkGroupContext = createContext(false);

const components: Components = {
  p: ({ node, children }) => {
    const isLinkGroup = Boolean(node?.children.some((child) => child.type === 'element' && child.tagName === 'a'))
      && Boolean(node?.children.every((child) => (child.type === 'text' && !child.value.trim())
        || (child.type === 'element' && (child.tagName === 'a' || child.tagName === 'br'))));
    const hasMedia = node?.children.some((child) => child.type === 'element' && child.tagName === 'img');
    return <p className={isLinkGroup ? 'flex flex-col gap-[4px] indent-0' : hasMedia ? undefined : 'indent-[2em]'}>
      <LinkGroupContext.Provider value={isLinkGroup}>{children}</LinkGroupContext.Provider>
    </p>;
  },
  br: () => useContext(LinkGroupContext) ? null : <br />,
  a: ({ href, title, children }) => {
    const isLinkGroup = useContext(LinkGroupContext);
    if (!href) return <span>{children}</span>;
    const download = /^download:[A-Za-z0-9_-]+\.(?:js|md)$/.test(title ?? '') && href.startsWith('/') && !href.startsWith('//')
      ? title!.slice('download:'.length) : undefined;
    const linkTitle = download || title === 'preview' ? undefined : title;
    const isPreview = isLinkGroup || title === 'preview' || (typeof children === 'string' && /^(在线预览|预览|探索作品)(?:[：:\s]|$)/.test(children));
    if (isPreview) {
      return (
        <a href={href} download={download} target={download ? undefined : '_blank'} rel="noopener noreferrer" title={linkTitle}
          className="group relative flex min-h-8 w-full items-center justify-center px-8 py-0.5 text-center indent-0 font-semibold tracking-widest text-[#454b3d] no-underline transition-colors hover:text-[#303729] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#62675a]">
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-75 mix-blend-multiply transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            style={{ backgroundImage: `url(${previewButton})`, backgroundSize: '100% 360%', filter: 'grayscale(1) brightness(1.08) contrast(1.1)' }} />
          <span className="relative">{children}</span>
        </a>
      );
    }
    return <a href={href} download={download} title={linkTitle} target={download || href.startsWith('#') ? undefined : '_blank'} rel="noopener noreferrer" className="text-[#365e70] underline underline-offset-3 hover:text-[#254555]">{children}</a>;
  },
  img: ({ src, alt, title }) => {
    if (typeof src !== 'string' || !src) return null;
    if (/\.(?:mp4|webm|ogg|mov)(?:[?#]|$)/i.test(src)) {
      return <video src={src} controls playsInline preload="metadata" aria-label={alt || '笔记视频'} title={title}
        className="my-4 inline-block max-h-[50dvh] w-full rounded-lg bg-black/5 align-middle">{alt || '视频演示'}</video>;
    }
    return <NoteImage key={src} src={src} alt={alt} title={title} />;
  },
  pre: ({ children }) => <pre tabIndex={0} className="my-4 max-w-full overflow-x-auto rounded-lg bg-[#e9ece3] p-4 text-xs leading-relaxed [&_code]:bg-transparent [&_code]:p-0">{children}</pre>,
  code: ({ className, children }) => <code className={`${className ?? ''} rounded bg-[#e9ece3] px-1 py-0.5 font-mono text-[0.9em]`}>{children}</code>,
  table: ({ children }) => <div role="region" aria-label="笔记表格" tabIndex={0} className="my-4 max-w-full overflow-x-auto rounded-lg border border-[#d7dccf]"><table className="w-full border-collapse text-left text-xs">{children}</table></div>,
  th: ({ children }) => <th className="border-b border-[#d7dccf] bg-[#e9ede2] px-3 py-2 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-[#e0e3d8] px-3 py-2">{children}</td>,
  input: ({ checked }) => <input type="checkbox" checked={Boolean(checked)} disabled className="mr-1 accent-[#626c58]" />,
};

export default function NoteMarkdown({ body }: { body: string }) {
  return (
    <div className="min-w-0 wrap-break-word text-[#454b40] [&>p]:my-3 [&_h1]:my-5 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:my-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:my-3 [&_h3]:text-base [&_h3]:font-semibold [&_h4]:my-3 [&_h4]:font-semibold [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[#a4ad99] [&_blockquote]:pl-4 [&_blockquote]:text-[#59604f] [&_hr]:my-5 [&_hr]:border-[#aaa99c]">
      <Markdown remarkPlugins={[remarkGfm]} components={components} urlTransform={defaultUrlTransform} skipHtml>{body}</Markdown>
    </div>
  );
}
