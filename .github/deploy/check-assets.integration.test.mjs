import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { setTimeout } from 'node:timers/promises';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const docker = (args, timeout = 15000) => exec('docker', args, { timeout, maxBuffer: 4 * 1024 * 1024 });

test('the production Alpine image checks real 404 headers and legal notices', { timeout: 240000 }, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), '3dpage-nginx-probe-'));
  const name = `3dpage-nginx-probe-${randomUUID()}`;
  const image = `${name}:test`;
  let built = false;
  let started = false;
  let networkCreated = false;
  let apiStarted = false;
  let toolStarted = false;
  let offlineStarted = false;
  let twoBuilt = false;
  let twoStarted = false;
  const twoName = `${name}-2d`;
  const twoImage = `${name}-2d:test`;
  const offlineName = `${name}-offline`;
  const network = `${name}-network`;
  const apiName = `${name}-api`;
  const toolName = `${name}-aitool`;
  t.after(async () => {
    try {
      if (started) await docker(['rm', '-f', name]);
      if (offlineStarted) await docker(['rm', '-f', offlineName]);
      if (apiStarted) await docker(['rm', '-f', apiName]);
      if (toolStarted) await docker(['rm', '-f', toolName]);
      if (twoStarted) await docker(['rm', '-f', twoName]);
      if (networkCreated) await docker(['network', 'rm', network]);
    } finally {
      try {
        if (built) await docker(['image', 'rm', image]);
        if (twoBuilt) await docker(['image', 'rm', twoImage]);
      } finally {
        assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
        assert.match(path.basename(root), /^3dpage-nginx-probe-[a-zA-Z0-9]+$/);
        await rm(root, { recursive: true, force: true });
      }
    }
  });
  for (const file of ['Dockerfile', 'Dockerfile.2d', '.dockerignore', 'nginx.conf', 'nginx-2d.conf', 'check-assets.sh']) {
    const contents = await readFile(new URL(file, import.meta.url), 'utf8');
    await writeFile(path.join(root, file), contents.replaceAll('\r\n', '\n'));
  }
  const fixtures = {
    'index.html': '<!doctype html><title>3D fixture</title>',
    '2D/index.html': '<!doctype html><title>2D fixture</title>',
    'THIRD-PARTY-NOTICES.txt': 'Legal notice fixture',
    'textures/sample.LICENSE.md': 'Texture license fixture',
    'textures/doors/door_left_sketch.webp': 'Stale file that must remain blocked',
    'public/textures/source-name.svg': 'Source path that must remain blocked',
    'public/integrity.json': '{}',
    'assets/A1b2c3d4.js': '/* hashed asset fixture */',
    'assets/B2c3d4e5.glb': 'hashed model fixture',
    'assets/C3d4e5f6.ktx2': 'hashed texture fixture',
    '2D/fonts/font.ttf': '2D font fixture',
    '2D/assets/fixture.js': '/* independent 2D bundle */',
    '2D/src/private.ts': 'blocked source',
  };
  for (const [file, contents] of Object.entries(fixtures)) {
    const target = path.join(root, 'site', file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
  await docker(['build', '--tag', image, root], 180000);
  built = true;
  // A static site's startup cannot depend on Alpine package mirrors or DNS.
  await docker(['run', '--detach', '--name', offlineName, '--network', 'none', image]);
  offlineStarted = true;
  for (let attempt = 0; attempt < 20; attempt++) {
    const { stdout } = await docker(['inspect', '--format', '{{.State.Health.Status}}', offlineName]);
    if (stdout.trim() === 'healthy') break;
    assert.notEqual(stdout.trim(), 'unhealthy');
    assert.ok(attempt < 19, 'Site startup must succeed without network access');
    await setTimeout(1000);
  }
  await docker(['rm', '-f', offlineName]);
  offlineStarted = false;
  await docker(['network', 'create', network]);
  networkCreated = true;
  await docker(['build', '--file', path.join(root, 'Dockerfile.2d'), '--tag', twoImage, root], 180000);
  twoBuilt = true;
  await docker(['run', '--detach', '--name', twoName, '--network', network, '--network-alias', 'page-2d', twoImage]);
  twoStarted = true;
  await docker(['run', '--detach', '--name', apiName, '--network', network, '--network-alias', 'ai-api', 'node:24-alpine',
    'node', '-e', `require('node:http').createServer((req,res)=>{
      if(req.url==='/health'){res.setHeader('Content-Type','application/json');res.end('{"status":"ok","chatConfigured":true}');return;}
      if(req.url!=='/api/ai/chat'){res.writeHead(404);res.end();return;}
      req.resume();res.setHeader('Content-Type','text/event-stream');
      res.write('event: token\\ndata: {"text":"fixture"}\\n\\n');
      setTimeout(()=>res.end('event: done\\ndata: {}\\n\\n'),30);
    }).listen(3001,'0.0.0.0')`], 120000);
  apiStarted = true;
  await docker(['run', '--detach', '--name', toolName, '--network', network, '--network-alias', 'ai-tool', 'node:24-alpine',
    'node', '-e', `require('node:http').createServer((req,res)=>{
      const url=new URL(req.url,'http://localhost');
      if(!['/AItool/','/AItool/core/index.js','/AItool/core/dist/selector.css'].includes(url.pathname)){
        res.writeHead(404,{'Cache-Control':'no-store'});res.end('missing tool resource');return;
      }
      res.setHeader('Cache-Control','no-cache');
      res.end('AItool fixture: '+req.url);
    }).listen(80,'0.0.0.0')`], 120000);
  toolStarted = true;
  await docker(['run', '--detach', '--name', name, '--network', network, image]);
  started = true;
  for (let attempt = 0; attempt < 30; attempt++) {
    const { stdout } = await docker(['inspect', '--format', '{{.State.Health.Status}}', name]);
    if (stdout.trim() === 'healthy') break;
    assert.notEqual(stdout.trim(), 'unhealthy', '3D health is independent of other backends');
    assert.ok(attempt < 29, 'Container did not become healthy');
    await setTimeout(1000);
  }
  const getHeaders = async (url) => {
    const { stdout } = await docker(['exec', name, 'curl', '--silent', '--show-error', '--max-time', '5',
      '--dump-header', '-', '--output', '/dev/null', `http://127.0.0.1${url}`]);
    return stdout;
  };
  for (const url of ['/public/textures/source-name.svg', '/public/integrity.json', '/textures/doors/door_left_sketch.webp', '/assets/missing.webp']) {
    const headers = await getHeaders(url);
    assert.match(headers, /^HTTP\/1\.1 404 /, url);
    assert.match(headers, /^Cache-Control: no-store\r?$/mi, url);
    assert.doesNotMatch(headers, /^(?:CDN-Cache-Control|Cloudflare-CDN-Cache-Control):/mi, url);
  }
  for (const url of ['/', '/2D/', '/THIRD-PARTY-NOTICES.txt', '/textures/sample.LICENSE.md', '/2D/fonts/font.ttf']) {
    assert.match(await getHeaders(url), /^HTTP\/1\.1 200 /, url);
  }
  for (const url of ['/assets/A1b2c3d4.js', '/assets/B2c3d4e5.glb', '/assets/C3d4e5f6.ktx2']) {
    const headers = await getHeaders(url);
    assert.match(headers, /^HTTP\/1\.1 200 /, url);
    assert.match(headers, /^Cache-Control: public, max-age=31536000, immutable\r?$/mi, url);
    assert.match(headers, /^CDN-Cache-Control: public, max-age=31536000\r?$/mi, url);
    assert.match(headers, /^Cloudflare-CDN-Cache-Control: public, max-age=31536000\r?$/mi, url);
  }
  for (const url of ['/', '/index.html', '/portfolio/example']) {
    const headers = await getHeaders(url);
    assert.match(headers, /^Cache-Control: .*no-store/mi, url);
    assert.doesNotMatch(headers, /^(?:CDN-Cache-Control|Cloudflare-CDN-Cache-Control):/mi, url);
  }
  assert.match(await getHeaders('/2D/assets/fixture.js'), /^Cache-Control: .*immutable\r?$/mi);
  for (const path of ['/2D/assets/missing.js', '/2D/src/private.ts', '/2D/.env']) {
    const response = await getHeaders(path);
    assert.match(response, /^HTTP\/1\.1 404 /);
    assert.match(response, /^Cache-Control: no-store\r?$/mi);
  }
  const reactRedirect = await getHeaders('/React');
  assert.match(reactRedirect, /^HTTP\/1\.1 308 /);
  assert.match(reactRedirect, /^Location: https:\/\/www\.lanbinquan\.top\/React\/\r?$/mi);
  const reactAssetRedirect = await getHeaders('/React/assets/editor.js?v=1');
  assert.match(reactAssetRedirect, /^HTTP\/1\.1 308 /);
  assert.match(reactAssetRedirect, /^Location: https:\/\/www\.lanbinquan\.top\/React\/assets\/editor\.js\?v=1\r?$/mi);
  assert.match(await getHeaders('/codeground'), /^Location: https:\/\/www\.lanbinquan\.top\/codeground\/\r?$/mi);
  assert.match(await getHeaders('/codeground/react/api/source'), /^Location: https:\/\/www\.lanbinquan\.top\/codeground\/react\/api\/source\r?$/mi);
  const toolRedirect = await getHeaders('/AItool?lang=zh');
  assert.match(toolRedirect, /^HTTP\/1\.1 301 /);
  assert.match(toolRedirect, /^Location: \/AItool\/\?lang=zh\r?$/mi);
  for (const url of ['/AItool/', '/AItool/core/index.js?v=1', '/AItool/core/dist/selector.css']) {
    const response = await docker(['exec', name, 'curl', '--fail', '--silent', '--dump-header', '-', '--max-time', '5', `http://127.0.0.1${url}`]);
    assert.match(response.stdout, /^HTTP\/1\.1 200 /, url);
    assert.match(response.stdout, /^Cache-Control: no-cache\r?$/mi, url);
    assert.ok(response.stdout.endsWith(`AItool fixture: ${url}`), 'Proxy must preserve the full path and query');
    assert.doesNotMatch(response.stdout, /immutable/);
  }
  const missingTool = await getHeaders('/AItool/missing.js');
  assert.match(missingTool, /^HTTP\/1\.1 404 /);
  assert.match(missingTool, /^Cache-Control: no-store\r?$/mi);
  const probe = await docker(['exec', name, 'sh', '/usr/local/bin/check-assets.sh']);
  assert.match(probe.stdout, /Retired media routes return 404\/no-store/);

  await docker(['exec', name, 'rm', '/usr/share/nginx/html/THIRD-PARTY-NOTICES.txt']);
  assert.match(await getHeaders('/THIRD-PARTY-NOTICES.txt'), /^HTTP\/1\.1 404 /);
  const withoutNotice = await docker(['exec', name, 'sh', '/usr/local/bin/check-assets.sh']);
  assert.match(withoutNotice.stdout, /Retired media routes return 404\/no-store/);

  const health = await docker(['exec', name, 'curl', '--fail', '--silent', '--max-time', '10', 'http://127.0.0.1/api/ai/health']);
  assert.equal(JSON.parse(health.stdout).chatConfigured, true);
  const chat = await docker(['exec', name, 'curl', '--fail', '--silent', '--max-time', '10', '-X', 'POST', 'http://127.0.0.1/api/ai/chat']);
  assert.match(chat.stdout, /event: token/);
  assert.match(chat.stdout, /event: done/);
  let limited = false;
  for (let i = 0; i < 6; i++) {
    const result = await docker(['exec', name, 'curl', '--silent', '--dump-header', '-', '--max-time', '5', '-X', 'POST', 'http://127.0.0.1/api/ai/chat']);
    if (/HTTP\/1\.1 429/.test(result.stdout)) {
      assert.match(result.stdout, /"code":"RATE_LIMITED"/);
      limited = true;
      break;
    }
  }
  assert.ok(limited, 'The trusted proxy must enforce per-visitor limits');
  await docker(['stop', apiName]);
  await docker(['stop', toolName]);
  assert.match(await getHeaders('/'), /^HTTP\/1\.1 200 /, 'AI downtime must not break the site');
  assert.match(await getHeaders('/2D/'), /^HTTP\/1\.1 200 /, 'AItool downtime must not break the 2D page');
  assert.match(await getHeaders('/api/ai/missing'), /^HTTP\/1\.1 404 /, 'API errors must not fall back to HTML');
  await docker(['stop', twoName]);
  assert.match(await getHeaders('/'), /^HTTP\/1\.1 200 /, '2D downtime must not affect 3D');
  assert.match(await getHeaders('/2D/'), /^HTTP\/1\.1 50[24] /, 'Never serve a stale bundled 2D release after split');
});
