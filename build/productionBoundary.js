// Node.js build tooling: imported by vite.config.js, never by browser modules.
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const MEDIA = /\.(?:avif|bin|gif|glb|gltf|ico|jpeg|jpg|ktx2|mp3|mp4|ogg|otf|png|svg|ttf|wav|webm|webp|woff2?)$/i;
const SOURCE = /\.(?:map|[cm]?[jt]sx?|vue|svelte|scss|sass|less)$/i;
const PRIVATE_DIRECTORY = /(?:^|\/)(?:\.[^/]+|src|public|node_modules|build|res)(?:\/|$)/i;
const CONFIG = /^(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|(?:vite|tsconfig)(?:\.[^/]*)?\.[^/]+|AGENTS\.md|README(?:\.[^/]+)?)$/i;

export function isLegalNotice(fileName) {
  const name = path.posix.basename(fileName);
  return /(?:^|[._-])(?:licen[cs]es?|copying|notices?)(?:[._-]|$)/i.test(name)
    && (path.posix.extname(name) === '' || /\.(?:txt|md)$/i.test(name));
}

// public/ holds imported media; only allowlisted documents retain fixed URLs.
export function isPublicAsset(fileName) {
  if (PRIVATE_DIRECTORY.test(fileName)) return false;
  return isLegalNotice(fileName) || /^(?:robots\.txt|sitemap\.xml|manifest\.webmanifest)$/i.test(fileName);
}

export function isInternalRequest(fileName) {
  if (PRIVATE_DIRECTORY.test(fileName) || /(?:^|\/)@(?:vite|fs|id)(?:\/|$)/i.test(fileName)) return true;
  if (isLegalNotice(fileName)) return false;
  return SOURCE.test(fileName) && !/\.m?js$/i.test(fileName)
    || /\.md$/i.test(fileName) || CONFIG.test(path.posix.basename(fileName));
}

export function isRetiredAssetRequest(fileName) {
  if (isLegalNotice(fileName)) return false;
  return /^\/?(?:(?:textures|sounds|fonts)(?:\/|$)|(?:bgm\.mp3|icon\.svg|apple-icon\.png)$)/i.test(fileName);
}

async function* publicFiles(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Public assets must not use symlinks: ${name}`);
    if (entry.isDirectory()) {
      if (!PRIVATE_DIRECTORY.test(name)) yield* publicFiles(path.join(directory, entry.name), `${name}/`);
    } else if (entry.isFile()) {
      if (isPublicAsset(name)) yield { name, source: await readFile(path.join(directory, entry.name)) };

    }
  }
}

function previewBoundary(outputRoot) {
  return async (request, response, next) => {
    const reject = (status) => {
      response.statusCode = status;
      response.setHeader('Cache-Control', 'no-store');
      response.end();
    };
    let pathname;
    try {
      pathname = decodeURIComponent((request.url || '/').split('?')[0]).replaceAll('\\', '/');
    } catch { return reject(400); }
    if (isInternalRequest(pathname) || isRetiredAssetRequest(pathname)) return reject(404);
    if (MEDIA.test(pathname) || /\.(?:css|m?js)$/i.test(pathname) || isLegalNotice(pathname)) {
      const target = path.resolve(outputRoot, `.${pathname}`);
      if (path.relative(outputRoot, target).startsWith('..')) return reject(404);
      try { if (!(await stat(target)).isFile()) return reject(404); }
      catch { return reject(404); }
      if (pathname.startsWith('/assets/')) response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
  };
}

export default function productionBoundary() {
  let config;
  return {
    name: 'production-boundary',
    enforce: 'post',
    configResolved(resolved) {
      config = resolved;
      if (config.command === 'build' && (config.build.sourcemap || !config.build.minify || config.build.copyPublicDir || config.publicDir)) {
        throw new Error('Production requires sourcemap=false, minify enabled and copyPublicDir=false and publicDir=false.');
      }
    },
    configurePreviewServer(server) {
      server.middlewares.use(previewBoundary(path.resolve(config.root, config.build.outDir)));
    },
    async generateBundle(_options, bundle) {
      {
        for await (const asset of publicFiles(path.resolve(config.root, 'public'))) {
          if (bundle[asset.name]) this.error(`Public asset conflicts with generated output: ${asset.name}`);
          this.emitFile({ type: 'asset', fileName: asset.name, source: asset.source });
        }
      }
    },
    writeBundle: {
      order: 'post',
      handler(_options, bundle) {
        for (const [name, item] of Object.entries(bundle)) {
          if (isInternalRequest(name) || isRetiredAssetRequest(name)) this.error(`Internal or retired file in production output: ${name}`);
          if ((MEDIA.test(name) || /\.(?:css|m?js)$/i.test(name)) && !/^assets\/[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/i.test(name)) {
            this.error(`Runtime asset must use a content-hash filename: ${name}`);
          }
          if (item.type === 'chunk' && (item.map || /[#@]\s*sourceMappingURL\s*=/.test(item.code))) this.error(`Source map in production output: ${name}`);
          if (name.endsWith('.css') && /[#@]\s*sourceMappingURL\s*=/.test(String(item.source))) this.error(`CSS source map in production output: ${name}`);
          if (name.endsWith('.html') && /(?:src|href)\s*=\s*["'][^"']*\/(?:src|@vite)\//i.test(String(item.source))) this.error(`Development entry in production output: ${name}`);
        }
      },
    },
  };
}
