import type { TargetServices } from './types';
import { androidAppInfo } from '../platform/android/app-info';
import { nativeSqliteBridge, isNativeDebugBuild } from '../infrastructure/db/android/native-bridge';
import { NativeProfileDatabase } from '../infrastructure/db/android/profiles';
import { createProfileService } from '../application/profiles/service';
let database = new NativeProfileDatabase(nativeSqliteBridge);

/**
 * Android (Capacitor) target. No service worker: the web assets are bundled in the APK and
 * updates arrive through a new app version.
 */
const profiles = createProfileService(
  {
    read: (work) => database.read(work),
    write: (work) => database.write(work),
  },
  () => crypto.randomUUID(),
  () => Date.now(),
);
let configured = false;
export const target: TargetServices = {
  name: 'android',
  appInfo: androidAppInfo,
  profiles,
  recovery: { state: () => database.state(), exportProfiles: () => database.exportProfiles() },
  async initialize() {
    if (!configured && isNativeDebugBuild()) {
      const { profileDebugConfiguration } =
        await import('../infrastructure/db/android/profile-debug');
      const debug = profileDebugConfiguration(nativeSqliteBridge);
      database = debug.database;
      window.__nativeProfiles = debug.harness;
      configured = true;
    }
    await database.initialize();
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
