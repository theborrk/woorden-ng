import { afterEach, expect, it, vi } from 'vitest';
import { target } from './web';

vi.mock('@capacitor/app', () => {
  throw new Error('The web target must not load the App plugin');
});
vi.mock('../sw', () => ({ setupServiceWorker: vi.fn() }));

afterEach(() => vi.unstubAllGlobals());

it('W04: the web target supplies build-time version and commit through the AppInfo port', async () => {
  vi.stubGlobal('__APP_VERSION__', '1.2.3');
  vi.stubGlobal('__APP_COMMIT__', 'abc1234');
  expect(target.appInfo).toBeDefined();
  await expect(target.appInfo.getInfo()).resolves.toEqual({ version: '1.2.3', build: 'abc1234' });
});
