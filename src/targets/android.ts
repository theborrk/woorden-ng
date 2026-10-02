import type { TargetServices } from './types';
import { nativeSqliteBridge, isNativeDebugBuild } from '../infrastructure/db/android/native-bridge';
import { openSpikeDatabase } from '../infrastructure/db/android/spike';

/**
 * Android (Capacitor) target. No service worker: the web assets are bundled in the APK and
 * updates arrive through a new app version.
 */
export const target: TargetServices = {
  name: 'android',
  async initialize() {
    await openSpikeDatabase(nativeSqliteBridge, 'woorden_spike_startup');
    if (isNativeDebugBuild()) {
      const { createStorageSpikeHarness } =
        await import('../infrastructure/db/android/debug-harness');
      window.__storageSpike = createStorageSpikeHarness(nativeSqliteBridge);
    }
  },
  registerUpdates() {
    // Intentionally empty: app updates come from the store or a newly installed APK.
  },
};
