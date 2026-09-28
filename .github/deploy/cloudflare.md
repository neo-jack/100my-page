# 3Dpage Cloudflare CDN

当前发布链路是 Vite → Docker Nginx → 现有 HTTPS 网关。参考 `res/ref/public/_headers` 的一年静态缓存思路，在 `nginx.conf` 设置响应头；本项目不是 Cloudflare Pages，复制 `_headers` 不会生效，也不需要参考项目的 Sanity 代理。

## 源站策略

- `/assets/` 中的 JS、CSS、字体、音频、图片和模型都使用 Vite 内容哈希文件名。成功响应设置浏览器 `Cache-Control: public, max-age=31536000, immutable`，以及 CDN 专用的一年 TTL。
- `Cloudflare-CDN-Cache-Control` 专门控制 Cloudflare；`CDN-Cache-Control` 供其他支持该头的 CDN 使用。它们只控制已具备缓存资格的响应，不会自动让所有扩展名获得 Cloudflare 缓存资格。
- HTML 和 SPA 回退仍为 `no-store`；缺失资源仍为 404/no-store，不发送 CDN 长期缓存头。API、监控和其他子项目不在这次静态缓存规则范围内。
- 更新资源必须重新构建生成新哈希，不能覆盖同一哈希 URL 的内容。正常版本发布无需清理所有 CDN 缓存。

## Cloudflare 控制台配置

`www.lanbinquan.top` 的 A 记录已开启代理；根域 `lanbinquan.top` 保持仅 DNS。开启代理作用于该主机的所有路径，不等同于已配置下面的自定义 Cache Rule。

1. 确认 `www.lanbinquan.top` 的 DNS 记录开启代理（橙云），HTTPS 可正常访问源站；只有 DNS 托管并不代表开启 CDN。
2. 在 Cache Rules 添加仅针对 3D 哈希资源的规则，表达式：

   ```text
   (http.host eq "www.lanbinquan.top" and starts_with(http.request.uri.path, "/assets/"))
   ```

3. Cache eligibility 选择 **Eligible for cache**，让 GLB、GLTF、KTX2 等非默认缓存扩展名也具备缓存资格。Edge TTL 选择使用源站 Cache-Control（没有头时绕过缓存）；Browser TTL 选择尊重源站。不配置忽略源站响应头的强制 TTL，不配置错误状态长期缓存。
4. 保留完整查询参数作为缓存键；不要给全站设置 Cache Everything。若已有全站缓存规则，需调整其范围或规则顺序，保证 HTML、`/api/`、`/3D/monitor/` 不受强制缓存影响。

这些设置属于 Cloudflare 账户，GitHub Actions 只发布源站配置，不会自动修改控制台规则。

## 发布后验证

从线上 HTML 或浏览器 Network 取一个当前真实的 `/assets/<hash>.<ext>` 地址，连续请求两次：

```powershell
curl.exe -sS -D - -o NUL https://www.lanbinquan.top/assets/替换为真实哈希文件名.js
curl.exe -sS -D - -o NUL https://www.lanbinquan.top/assets/替换为真实哈希文件名.js
curl.exe -sS -D - -o NUL https://www.lanbinquan.top/
curl.exe -sS -D - -o NUL https://www.lanbinquan.top/assets/nonexistent-cdn-check.glb
```

静态资源应出现一年浏览器 TTL；Cloudflare 命中时为 `CF-Cache-Status: HIT`，通常还有 `Age`。首个请求可能是 MISS；GLB/KTX2 也需用真实地址验证。Cloudflare 专用缓存头可能在边缘被移除，应在源站验证其存在，公网用缓存状态判断。

首页必须保持 no-store，缺失文件必须为 404/no-store。没有 `CF-Ray` / `CF-Cache-Status` 时先核对 DNS 代理和实际访问链路；不要将源站缓存头视为边缘已命中的证明。

真实 Nginx 回归：`node --test .github/deploy/check-assets.integration.test.mjs`（需要 Linux Docker）。
