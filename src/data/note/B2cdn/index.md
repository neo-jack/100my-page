---
title: CDN 优化
---

网站包含较多贴图、字体与音频，资源下载同样影响访问体验。缓存策略以复用未变化的静态资源为主，通过浏览器与 CDN 缓存减少重复传输，更新时使用新的资源地址获取内容。

Cloudflare 通过 DNS 代理接入请求链路。控制台中的橙色云朵与“已代理”状态表示对应域名已启用代理；具体资源是否缓存，仍取决于缓存规则与实际响应。

资源版本通过内容哈希管理。Vite 打包时生成带内容哈希的文件名，贴图或代码变化时，对应地址随之更新。旧地址可长期缓存，新页面引用新地址，避免每次发布后重复下载未变化的素材。

下面是项目 Nginx 配置中对哈希资源的处理：

```nginx
location ~* ^/(?:2D/)?assets/ {
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header CDN-Cache-Control "public, max-age=31536000";
    add_header Cloudflare-CDN-Cache-Control "public, max-age=31536000";
}
```

该配置为成功返回的静态资源设置一年缓存。`immutable` 表示在缓存有效期内，同一个地址的内容不会变化，所以更新时必须生成新的哈希地址。HTML 入口使用 `no-store`，确保访问时获取最新的资源引用；不存在的文件返回 404，不进行长期缓存。

Cloudflare 侧还需要单独设置缓存规则，让主站的 `/assets/` 资源具备缓存资格，并尊重源站的缓存响应头。该规则仅适用于静态资源，不应将 API 与监控数据纳入长期缓存。

实际缓存命中情况通过请求的 `CF-Cache-Status` 验证，`HIT` 表示本次请求命中边缘缓存。控制台代理状态与源站缓存配置均不能单独证明 CDN 命中。
