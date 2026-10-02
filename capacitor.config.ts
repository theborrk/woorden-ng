import type { CapacitorConfig } from '@capacitor/cli';

// Keep this file self-contained (the Capacitor CLI loads it on its own).
// `npm run rename-app` keeps appId/appName in sync with app.config.ts and the Android project.
const config: CapacitorConfig = {
  appId: 'nl.theborrk.woorden',
  appName: 'Woorden',
  // The Android build target (npm run build:android) writes here; it never registers a service worker.
  webDir: 'dist/android',
};

export default config;
