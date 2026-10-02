import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the PWA service worker (web only; never call this in native builds, where updates ship
 * with the APK and a service worker would serve stale assets).
 */
export function setupServiceWorker(onUpdateReady: (applyUpdate: () => void) => void): void {
  const updateServiceWorker = registerSW({
    onNeedRefresh() {
      onUpdateReady(() => {
        void updateServiceWorker(true);
      });
    },
  });
}
