import type { TargetServices } from './types';

/**
 * Android (Capacitor) target. No service worker: the web assets are bundled in the APK and
 * updates arrive through a new app version.
 */
export const target: TargetServices = {
  name: 'android',
  registerUpdates() {
    // Intentionally empty: app updates come from the store or a newly installed APK.
  },
};
