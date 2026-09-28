// Emit metadata before JavaScript executes; the site origin comes from site.ts.
export default function seo(origin) {
  const url = new URL('/', origin).href;
  const title = '蓝斌铨 Laaaanbq | 前端工程与 3D 个人作品集';
  const description = '蓝斌铨（Laaaanbq）的 3D 个人作品集，展示前端工程、React 原理、AI 工作流与界面元素选择器实践。';
  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${url}sitemap.xml\n`;
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url}</loc></url></urlset>\n`;
  return {
    name: 'site-seo',
    transformIndexHtml() {
      const meta = (name, content) => ({ tag: 'meta', attrs: { name, content }, injectTo: 'head' });
      const og = (name, content) => ({ tag: 'meta', attrs: { property: `og:${name}`, content }, injectTo: 'head' });
      return [
        { tag: 'title', children: 'LBQ©3D©2026', injectTo: 'head' },
        meta('description', description), meta('author', '蓝斌铨（Laaaanbq）'),
        meta('robots', 'index, follow'), meta('theme-color', '#f8f7f4'),
        { tag: 'link', attrs: { rel: 'canonical', href: url }, injectTo: 'head' },
        og('type', 'website'), og('title', title), og('description', description),
        og('url', url), og('site_name', 'Laaaanbq 的个人作品集'), og('locale', 'zh_CN'),
        meta('twitter:card', 'summary'), meta('twitter:title', title), meta('twitter:description', description),
        { tag: 'script', attrs: { type: 'application/ld+json' }, injectTo: 'head', children: JSON.stringify({
          '@context': 'https://schema.org', '@type': 'ProfilePage', '@id': `${url}#profile`,
          url, name: title, description, inLanguage: 'zh-CN',
          mainEntity: { '@type': 'Person', name: '蓝斌铨', alternateName: 'Laaaanbq', url },
        }).replaceAll('<', '\\u003c') },
        { tag: 'noscript', injectTo: 'body', children: `<style>#startup-loader{display:none}body{overflow:auto}</style><main style="max-width:48rem;margin:4rem auto;padding:1.5rem;font:18px/1.8 sans-serif"><h1>${title}</h1><p>${description}</p><p>此页面的 3D 互动体验需要 JavaScript。您也可以访问<a href="${url}2D/">二维个人主页</a>。</p></main>` },
      ];
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = (request.url || '/').split('?')[0];
        if (pathname !== '/robots.txt' && pathname !== '/sitemap.xml') return next();
        response.setHeader('Content-Type', pathname === '/robots.txt' ? 'text/plain; charset=utf-8' : 'application/xml; charset=utf-8');
        response.end(pathname === '/robots.txt' ? robots : sitemap);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
    },
  };
}
