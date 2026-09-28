## B2cdn

CDN 优化的个人实践说明，采用简洁书面表达，结合 DNS 代理配置与实际缓存代码解释资源分发思路。

### Important files

- `index.md` — Cloudflare 代理、内容哈希、缓存响应头与命中验证的介绍。
- 配置来源 — 本仓库 `.github/deploy/nginx.conf` 与 `.github/deploy/cloudflare.md`；控制台状态以实际截图为准。

### Implementation notes

- 区分橙云代理开启、资源具备缓存资格与实际 HIT，不凭截图或响应头宣称提速结果。
- 展示控制台图片前隐藏源站 IP 等内部信息，不虚构控制台截图。
- 缓存代码摘录保持与 Nginx 一致；说明哈希资源长期缓存、HTML 与 404 不长期缓存的边界。
