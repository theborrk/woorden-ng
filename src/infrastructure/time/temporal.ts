import { Temporal as PolyfillTemporal } from '@js-temporal/polyfill';

// Keep the fallback local: installing it globally would hide native support.
export const Temporal =
  (globalThis as typeof globalThis & { Temporal?: typeof PolyfillTemporal }).Temporal ??
  PolyfillTemporal;
