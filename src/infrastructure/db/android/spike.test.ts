import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../../app';
import { openSpikeDatabase } from './spike';
import type { NativeSqliteBridge } from './bridge';

describe('native storage availability', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('I20: missing native plugin rejects visibly without opening alternative storage', async () => {
    const bridge: NativeSqliteBridge = {
      isAvailable: () => false,
      connect: vi.fn<NativeSqliteBridge['connect']>(),
    };
    const indexedDb = vi.fn();
    vi.stubGlobal('indexedDB', { open: indexedDb });
    const localStorageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const root = document.createElement('div');
    const view = renderApp(root, { name: 'Woorden', platform: 'android', online: true });
    await expect(openSpikeDatabase(bridge, 'woorden_spike_unavailable')).rejects.toThrow(
      'Native SQLite is unavailable. Data cannot be saved.',
    );
    await openSpikeDatabase(bridge, 'woorden_spike_unavailable').catch(() =>
      view.showStorageError(),
    );
    const alert = root.querySelector<HTMLElement>('[data-testid="storage-error"]');
    expect(alert?.hidden).toBe(false);
    expect(alert?.textContent).toContain('Data cannot be saved. Restart the app to retry.');
    expect(bridge.connect).not.toHaveBeenCalled();
    expect(indexedDb).not.toHaveBeenCalled();
    expect(localStorageWrite).not.toHaveBeenCalled();
  });

  it('I20: native open errors propagate without opening alternative storage', async () => {
    const bridge: NativeSqliteBridge = {
      isAvailable: () => true,
      connect: vi
        .fn<NativeSqliteBridge['connect']>()
        .mockRejectedValue(new Error('Disk unavailable')),
    };
    await expect(openSpikeDatabase(bridge, 'woorden_spike_unavailable')).rejects.toThrow(
      'Disk unavailable',
    );
    expect(bridge.connect).toHaveBeenCalledExactlyOnceWith('woorden_spike_unavailable');
  });
});
