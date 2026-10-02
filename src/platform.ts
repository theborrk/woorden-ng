import type { TargetName } from './targets/types';

export type Platform = 'android' | 'pwa' | 'browser';

type WindowLike = Pick<Window, 'matchMedia'>;

/**
 * Where the app is running, for display and UX decisions. The build target (not the user agent)
 * decides which platform adapters are used; this only distinguishes an installed PWA from a tab.
 */
export function detectPlatform(target: TargetName, win: WindowLike = window): Platform {
  if (target === 'android') return 'android';
  return win.matchMedia('(display-mode: standalone)').matches ? 'pwa' : 'browser';
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  android: 'Android app',
  pwa: 'Installed PWA',
  browser: 'Browser',
};
