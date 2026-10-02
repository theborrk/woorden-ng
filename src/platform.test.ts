import { describe, expect, it, vi } from 'vitest';
import { detectPlatform } from './platform';
import { target as androidTarget } from './targets/android';

vi.mock('virtual:pwa-register', () => ({ registerSW: vi.fn(() => vi.fn()) }));

const win = (standalone: boolean) => ({
  matchMedia: (query: string) =>
    ({ matches: standalone && query === '(display-mode: standalone)' }) as MediaQueryList,
});

describe('detectPlatform', () => {
  it('reports android for the Android build target', () => {
    expect(detectPlatform('android', win(true))).toBe('android');
  });

  it('reports pwa when the web build is launched from the home screen', () => {
    expect(detectPlatform('web', win(true))).toBe('pwa');
  });

  it('reports browser for the web build in a normal tab', () => {
    expect(detectPlatform('web', win(false))).toBe('browser');
  });
});

describe('build targets', () => {
  it('android never registers a service worker', async () => {
    const { registerSW } = await import('virtual:pwa-register');
    const onUpdate = vi.fn();
    androidTarget.registerUpdates(onUpdate);
    expect(registerSW).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('web registers the service worker and forwards the update prompt', async () => {
    const { registerSW } = await import('virtual:pwa-register');
    const { target: webTarget } = await import('./targets/web');
    const onUpdate = vi.fn();
    webTarget.registerUpdates(onUpdate);
    expect(registerSW).toHaveBeenCalledOnce();
    const options = vi.mocked(registerSW).mock.calls[0]?.[0];
    options?.onNeedRefresh?.();
    expect(onUpdate).toHaveBeenCalledOnce();
  });
});
