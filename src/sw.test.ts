import { expect, it, vi } from 'vitest';

const { registerSW, activate } = vi.hoisted(() => ({ registerSW: vi.fn(), activate: vi.fn() }));
vi.mock('virtual:pwa-register', () => ({ registerSW }));
import { setupServiceWorker } from './sw';

it('W04: a waiting worker provides an action that activates the service worker', () => {
  let needRefresh: (() => void) | undefined;
  registerSW.mockImplementation((options: { onNeedRefresh: () => void }) => {
    needRefresh = options.onNeedRefresh;
    return activate;
  });
  const ready = vi.fn<(applyUpdate: () => void) => void>();
  setupServiceWorker(ready);
  expect(ready).not.toHaveBeenCalled();
  needRefresh?.();
  expect(ready).toHaveBeenCalledOnce();
  const apply = ready.mock.calls[0]?.[0];
  apply?.();
  expect(activate).toHaveBeenCalledWith(true);
});
