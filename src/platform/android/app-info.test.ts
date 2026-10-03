import { afterEach, expect, it, vi } from 'vitest';
import { target } from '../../targets/android';

const getInfo = vi.hoisted(() => vi.fn());
vi.mock('@capacitor/app', () => ({ App: { getInfo } }));

afterEach(() => vi.resetAllMocks());

it('W47: the Android composition root reads the native version name and version code', async () => {
  getInfo.mockResolvedValue({
    id: 'nl.theborrk.woorden.dev',
    name: 'Woorden',
    version: 'pr-test.abc1234-dev',
    build: '123456',
  });
  expect(target.appInfo).toBeDefined();
  await expect(target.appInfo.getInfo()).resolves.toEqual({
    version: 'pr-test.abc1234-dev',
    build: '123456',
  });
  expect(getInfo).toHaveBeenCalledExactlyOnceWith();
});

it('W47: a native plugin failure rejects instead of substituting web metadata', async () => {
  getInfo.mockRejectedValue(new Error('Native App unavailable'));
  await expect(target.appInfo.getInfo()).rejects.toThrow('Native App unavailable');
});
