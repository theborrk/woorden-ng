import { defineConfig } from '@playwright/test';

// Device tests (npm run test:e2e:android): run against the debug APK on an Android emulator or a
// phone connected over adb, never in a desktop browser. CI runs them on an emulator through
// .github/workflows/android-device-tests.yml, which installs the APK first (scripts/device-tests.sh).
// Fixtures and helpers: e2e-android/support/device.ts.
export default defineConfig({
  testDir: 'e2e-android',
  outputDir: 'test-results/android',
  // One device, one app instance: tests run one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Emulators are slow; app launches and WebView attaches take seconds.
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/android' }]]
    : 'list',
  projects: [{ name: 'android' }],
});
