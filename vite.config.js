import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import productionBoundary from './build/productionBoundary.js';
import notes from './build/notes.js';
import seo from './build/seo.js';
import siteConfig from './site.config.json' with { type: 'json' };
import { PUBLIC_SITE_ORIGIN } from './src/data/site.ts';

process.env.VITE_RELEASE ||= process.env.GITHUB_SHA || 'local';

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
for (const [key, fallback] of Object.entries({ VITE_MONITOR_SCRIPT: siteConfig.monitorScript, VITE_MONITOR_ENDPOINT: siteConfig.monitorEndpoint, VITE_MONITOR_HOST: siteConfig.monitorHost, VITE_MONITOR_PROJECT: siteConfig.monitorProject })) process.env[key] ??= env[key] ?? fallback ?? '';
const siteOrigin = env.VITE_SITE_ORIGIN || PUBLIC_SITE_ORIGIN;
const aiProxy = { '/api/ai': { target: env.AI_PROXY_TARGET || siteOrigin, changeOrigin: true } };

export default defineConfig({
  publicDir: false,
  plugins: [tailwindcss(), react(), notes(), seo(siteOrigin), productionBoundary()],
  server: { proxy: aiProxy },
  preview: { proxy: aiProxy },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    copyPublicDir: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[hash][extname]',
        entryFileNames: 'assets/[hash].js',
        chunkFileNames: 'assets/[hash].js',
      },
    },
  },
});
