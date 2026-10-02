import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';
import { APP } from './app.config.ts';

/**
 * Two build targets from one codebase (see docs/adr):
 * - `vite build --mode web`     -> dist/web      PWA with service worker, base path from APP_BASE
 * - `vite build --mode android` -> dist/android  bundled into the Capacitor app, no service worker
 * The `#target` import resolves to src/targets/<target>.ts: the composition root for platform adapters.
 */
type Target = 'web' | 'android';

function normalizeBase(raw: string | undefined): string {
  const value = (raw ?? '/').trim() || '/';
  return `/${value.replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/');
}

// Fills %APP_*% placeholders in index.html from app.config.ts (single source of truth).
const appMeta = {
  name: 'app-meta',
  transformIndexHtml: {
    order: 'pre' as const,
    handler: (html: string) =>
      html
        .replaceAll('%APP_NAME%', APP.name)
        .replaceAll('%APP_DESCRIPTION%', APP.description)
        .replaceAll('%APP_THEME_COLOR%', APP.themeColor),
  },
};

export default defineConfig(({ mode }) => {
  const target: Target = mode === 'android' ? 'android' : 'web';
  const base = target === 'android' ? '/' : normalizeBase(process.env.APP_BASE);

  return {
    base,
    define: {
      __APP_TARGET__: JSON.stringify(target),
    },
    resolve: {
      alias: {
        '#target': fileURLToPath(new URL(`./src/targets/${target}.ts`, import.meta.url)),
      },
    },
    plugins: [
      appMeta,
      ...(target === 'web'
        ? [
            VitePWA({
              // 'prompt': a new version waits until the user accepts the update banner (src/sw.ts).
              registerType: 'prompt',
              injectRegister: false,
              includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
              manifest: {
                id: base,
                name: APP.name,
                short_name: APP.shortName,
                description: APP.description,
                theme_color: APP.themeColor,
                background_color: APP.backgroundColor,
                display: 'standalone',
                start_url: base,
                scope: base,
                icons: [
                  { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                  { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                  {
                    src: 'maskable-icon-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable',
                  },
                ],
              },
              workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
                navigateFallback: 'index.html',
                // CI publishes review screenshots under <base>__review/ on preview deployments only.
                navigateFallbackDenylist: [/\/__review\//],
                cleanupOutdatedCaches: true,
              },
            }),
          ]
        : []),
    ],
    build: {
      outDir: `dist/${target}`,
      emptyOutDir: true,
      sourcemap: true,
    },
    test: {
      environment: 'happy-dom',
      // Unit tests sit next to the code; the blueprint's tests/domain and tests/integration and the
      // content tools (tools/) are picked up too.
      include: [
        'src/**/*.test.ts',
        'tests/**/*.test.ts',
        'tools/**/*.test.{mjs,ts}',
        'scripts/**/*.test.{mjs,ts}',
      ],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.ts'],
        exclude: ['src/**/*.test.ts', 'src/main.ts'],
        reporter: ['text', 'json-summary'],
      },
    },
  };
});
