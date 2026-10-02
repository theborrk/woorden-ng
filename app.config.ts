/**
 * Single source of truth for the app's identity on the web side (PWA manifest, page title).
 * `npm run rename-app` rewrites this file together with capacitor.config.ts and the Android project.
 * Do not edit `id` after the first public release: it is the permanent Android application ID.
 */
export const APP = {
  id: 'io.github.theborrk.woorden',
  name: 'Woorden',
  shortName: 'Woorden',
  description: 'Learn Dutch words that stay: spaced retrieval practice that works offline.',
  // The original app's Delft blue and paper colors (legacy/index.html).
  themeColor: '#15397A',
  backgroundColor: '#FBF6EE',
} as const;
