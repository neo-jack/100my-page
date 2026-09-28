import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { build, preview } from 'vite';
import sharp from 'sharp';
import productionBoundary, { isInternalRequest, isPublicAsset, isRetiredAssetRequest } from './productionBoundary.js';
import { encodeLosslessRaster, verifyAssetIntegrity, verifySoundIntegrity } from './assetIntegrity.js';

const blocked = (url) => isInternalRequest(url) || isRetiredAssetRequest(url);

test('public documents retain their URLs; source paths and retired media are blocked', () => {
  for (const name of ['LICENSE', 'COPYING', 'LICENSE-MIT.md', 'textures/a.LICENSE.txt', 'THIRD-PARTY-NOTICES.md']) {
    assert.equal(isPublicAsset(name), true, name);
    assert.equal(blocked(name), false, name);
  }
  for (const name of ['AGENTS.md', 'textures/AGENTS.md', '.env', '.git/config', 'src/App.tsx', 'assets/app.js.map', 'vite.config.js', 'package-lock.json', 'textures/image.webp', 'fonts/font.ttf', 'sounds/wind.mp3', 'bgm.mp3', 'icon.svg', 'apple-icon.png']) {
    assert.equal(isPublicAsset(name), false, name);
    assert.equal(blocked(name), true, name);
  }
  assert.equal(blocked('assets/A1b2c3d4.js'), false);
  assert.equal(blocked('/2D/assets/image.png'), false);
  assert.equal(blocked('/2D/fonts/font.ttf'), false);
});

test('Nginx agrees with preview for sources, retired routes and license exceptions', async () => {
  for (const filename of ['../.github/deploy/nginx.conf', '../nginx.conf']) {
  const nginx = await readFile(new URL(filename, import.meta.url), 'utf8');
  const rules = [...nginx.matchAll(/location ~\* (\S+) \{([^}]+)\}/g)].map((match) => ({ pattern: new RegExp(match[1], 'i'), blocked: /return 404;/.test(match[2]) }));
  assert.ok(rules.length >= 4);
  for (const url of ['/public/textures/image.webp', '/src/bootstrap.ts', '/2D/src/main.ts', '/@vite/client', '/@fs/path', '/.git/config', '/AGENTS.md', '/textures/AGENTS.md', '/assets/app.js.map', '/package-lock.json', '/vite.config.js', '/textures/image.webp', '/sounds/wind.mp3', '/fonts/font.ttf', '/bgm.mp3', '/icon.svg', '/apple-icon.png', '/2D/fonts/font.ttf', '/assets/A1b2c3d4.js', '/LICENSE', '/LICENSE-MIT.md', '/textures/image.LICENSE.txt', '/THIRD-PARTY-NOTICES.md']) {
    assert.equal(rules.find(({ pattern }) => pattern.test(url))?.blocked ?? false, blocked(url), url);
  }
  const retiredRule = rules.find(({ pattern }) => pattern.test('/textures/image.webp'));
  assert.ok(retiredRule.blocked);
  assert.match(nginx, /Cache-Control "no-store" always/);
  }
});

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), '3dpage-release-'));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.match(path.basename(root), /^3dpage-release-[a-zA-Z0-9]+$/);
    await rm(root, { recursive: true, force: true });
  });
  for (const directory of ['src', 'public/textures', 'public/.git']) await mkdir(path.join(root, directory), { recursive: true });
  const files = {
    'index.html': '<html><head><link rel="preload" href="/public/source-name.svg" as="image"><style>body{background:url("/public/source-name.svg")}</style></head><body><script type="module" src="/src/main.js"></script></body></html>',
    'src/main.js': 'import image from "../public/source-name.svg?url";document.body.dataset.image = image;',
    'public/source-name.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
    'public/unused-name.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>',
    'public/textures/sample.LICENSE.txt': 'Existing copyright and license notice.\n',
    'public/LICENSE-MIT.md': '# Existing MIT notice\n',
    'public/AGENTS.md': 'Internal instructions',
    'public/textures/AGENTS.md': 'Internal texture notes',
    'public/leaked.js.map': '{"sourcesContent":["source"]}',
    'public/.git/config': 'internal git configuration',
  };
  for (const [name, contents] of Object.entries(files)) await writeFile(path.join(root, name), contents);
  return { root, files, config: {
    root, publicDir: false, configFile: false, logLevel: 'silent', plugins: [productionBoundary()],
    build: { outDir: 'dist', minify: 'esbuild', sourcemap: false, copyPublicDir: false, assetsInlineLimit: 0,
      rollupOptions: { output: { assetFileNames: 'assets/[hash][extname]', entryFileNames: 'assets/[hash].js', chunkFileNames: 'assets/[hash].js' } } },
  } };
}

test('imports, CSS and HTML share one hashed asset; unused media are omitted; preview blocks stale copies', async (t) => {
  const { root, files, config } = await fixture(t);
  await build(config);
  const output = await readdir(path.join(root, 'dist'), { recursive: true });
  const media = output.filter((name) => name.endsWith('.svg'));
  assert.equal(media.length, 1);
  const assetName = media[0].replaceAll('\\', '/');
  assert.match(assetName, /^assets\/[A-Za-z0-9_-]{8,}\.svg$/);
  assert.equal(await readFile(path.join(root, 'dist', assetName), 'utf8'), files['public/source-name.svg']);
  for (const name of ['textures/sample.LICENSE.txt', 'LICENSE-MIT.md']) assert.equal(await readFile(path.join(root, 'dist', name), 'utf8'), files[`public/${name}`]);
  assert.equal(output.some((name) => /AGENTS|\.map$|\.git|source-name|unused-name/.test(name)), false);
  const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
  assert.doesNotMatch(html, /\/src\//);
  assert.ok(html.includes(assetName));
  await mkdir(path.join(root, 'dist/textures'), { recursive: true });
  await writeFile(path.join(root, 'dist/textures/image.svg'), 'stale media');
  await writeFile(path.join(root, 'dist/AGENTS.md'), 'stale instructions');
  const server = await preview({ ...config, preview: { host: '127.0.0.1', port: 0, open: false } });
  try {
    const base = `http://127.0.0.1:${server.httpServer.address().port}`;
    for (const url of ['/public/textures/source-name.svg', '/build/assetBaseline.json', '/AGENTS.md', '/textures/%41GENTS.md?raw', '/src/main.js', '/@vite/client', '/.git/config', '/assets/app.js.map', '/vite.config.js', '/package.json', '/textures/image.svg', '/%74extures/image.svg?v=old', '/sounds/wind.mp3', '/fonts/font.ttf', '/bgm.mp3', '/assets/missing-file.webp']) {
      const response = await fetch(base + url);
      assert.equal(response.status, 404, url);
      assert.equal(response.headers.get('cache-control'), 'no-store', url);
    }
    for (const url of ['/', '/textures/sample.LICENSE.txt', '/LICENSE-MIT.md', '/'+assetName]) assert.equal((await fetch(base + url)).status, 200, url);
    assert.match((await fetch(base+'/'+assetName)).headers.get('cache-control'), /immutable/);
    assert.match((await fetch(base+'/')).headers.get('cache-control'), /no-cache/);
  } finally { await server.close(); }
});

test('unreferenced public media are omitted and unsafe build settings fail', async (t) => {
  const { root, config } = await fixture(t);
  for (const settings of [{ sourcemap: true }, { sourcemap: 'inline' }, { sourcemap: 'hidden' }, { minify: false }, { copyPublicDir: true }]) {
    await assert.rejects(build({ ...config, plugins: [productionBoundary()], build: { ...config.build, ...settings } }), /Production requires/);
  }
  await writeFile(path.join(root, 'public/textures/legacy.svg'), '<svg/>');
  await assert.rejects(build({ ...config, publicDir: 'public', plugins: [productionBoundary()] }), /Production requires/);
  await build({ ...config, plugins: [productionBoundary()] });
  assert.equal((await readdir(path.join(root, 'dist'), { recursive: true })).some(name => name.includes('legacy')), false);
});

test('lossless encoder preserves colour channels even when alpha is zero', async () => {
  const rgba = Buffer.from([21, 80, 201, 0, 11, 41, 252, 1, 15, 209, 160, 127, 240, 42, 64, 255]);
  const input = await sharp(rgba, { raw: { width: 2, height: 2, channels: 4 } }).png().toBuffer();
  for (const format of ['webp', 'png']) {
    const { encoded } = await encodeLosslessRaster(input, format);
    assert.deepEqual(await sharp(encoded).ensureAlpha().raw().toBuffer(), rgba);
  }
});

test('the integrity manifest covers every current raster asset and verifies its pixel baseline', async () => {
  const assetRoot = new URL('../public/', import.meta.url);
  const files = (await readdir(assetRoot, { recursive: true }))
    .filter((file) => /\.(?:webp|png|jpe?g)$/i.test(file))
    .map((file) => file.replaceAll('\\', '/')).sort();
  const manifest = JSON.parse(await readFile(new URL('assetBaseline.json', import.meta.url), 'utf8'));
  assert.deepEqual(manifest.images.map((image) => image.file).sort(), files);
  assert.equal(await verifyAssetIntegrity(), files.length);
  const soundManifest = JSON.parse(await readFile(new URL('sounds/sources.json', assetRoot), 'utf8'));
  const sounds = (await readdir(new URL('sounds/', assetRoot))).filter((name) => /\.(?:mp3|ogg|wav|flac)$/i.test(name)).sort();
  assert.deepEqual(soundManifest.sounds.map((sound) => sound.file).sort(), sounds);
  assert.equal(await verifySoundIntegrity(), sounds.length);
});
