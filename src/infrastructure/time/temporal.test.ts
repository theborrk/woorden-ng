import { Temporal as PolyfillTemporal } from '@js-temporal/polyfill';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it('selects the pinned local fallback when native Temporal is absent', async () => {
  vi.stubGlobal('Temporal', undefined);
  vi.resetModules();
  const { Temporal } = await import('./temporal');
  expect(Temporal).toBe(PolyfillTemporal);
  expect('Temporal' in globalThis && globalThis.Temporal).toBeUndefined();
});

it('preserves the native namespace when Temporal is available', async () => {
  const nativeNamespace = { ...PolyfillTemporal };
  vi.stubGlobal('Temporal', nativeNamespace);
  vi.resetModules();
  const { Temporal } = await import('./temporal');
  expect(Temporal).toBe(nativeNamespace);
});
