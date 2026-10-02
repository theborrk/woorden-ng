import { defineConfig, devices } from '@playwright/test';

// Optional: point at a pre-installed Chromium (useful in agent sandboxes that cannot download browsers).
const chromiumPath = process.env.PW_CHROMIUM_PATH;

// The web build can be served under a sub-path (APP_BASE, e.g. /my-app/). Tests navigate with
// relative URLs ('./'), so the same suite covers '/' and any sub-path.
const base = `/${(process.env.APP_BASE ?? '').replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/');

// CI installs the browsers listed in package.json "config.playwrightBrowsers"; keep that list in
// sync when adding projects for other browsers.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:4173${base}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
      },
    },
  ],
  // Tests run against the production web build (service worker included), not the dev server.
  webServer: {
    command: 'npm run build:web && npm run preview',
    url: `http://127.0.0.1:4173${base}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
