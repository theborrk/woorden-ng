import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../../app';
import { target } from '../../../targets/android';
import { nativeSqliteBridge } from './native-bridge';

const mocks = vi.hoisted(() => ({
  platform: vi.fn(() => 'android'),
  available: vi.fn(() => true),
  create: vi.fn<() => Promise<void>>(),
  open: vi.fn<() => Promise<void>>(),
  close: vi.fn<() => Promise<void>>(),
  query: vi.fn(() => Promise.resolve({ values: [{ user_version: 2 }] })),
  execute: vi.fn(() => Promise.resolve({ changes: { changes: 0 } })),
  run: vi.fn(() => Promise.resolve({ changes: { changes: 1 } })),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: mocks.platform, isPluginAvailable: mocks.available },
}));
vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: {
    createConnection: mocks.create,
    open: mocks.open,
    closeConnection: mocks.close,
    query: mocks.query,
    execute: mocks.execute,
    run: mocks.run,
  },
}));

describe('native target initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.available.mockReturnValue(true);
    mocks.platform.mockReturnValue('android');
    mocks.open.mockResolvedValue(undefined);
    delete window.__storageSpike;
    delete window.Capacitor;
  });
  afterEach(() => {
    delete window.__storageSpike;
    delete window.Capacitor;
  });

  it('I20: missing plugin surfaces the storage error through Android initialization', async () => {
    mocks.available.mockReturnValue(false);
    const root = document.createElement('div');
    const view = renderApp(root, { name: 'Woorden', platform: 'android', online: true });
    await expect(target.initialize()).rejects.toThrow('Data cannot be saved.');
    await target.initialize().catch(() => view.showStorageError());
    expect(root.querySelector<HTMLElement>('[data-testid="storage-error"]')?.hidden).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(window.__storageSpike).toBeUndefined();
  });

  it('exposes the device test handle only when Capacitor marks the APK debuggable', async () => {
    window.Capacitor = { DEBUG: false };
    await target.initialize();
    expect(window.__storageSpike).toBeUndefined();
    window.Capacitor = { DEBUG: true };
    await target.initialize();
    expect(window.__storageSpike).toBeDefined();
  });

  it('does not expose a test handle when the debug flag is absent', async () => {
    await target.initialize();
    expect(window.__storageSpike).toBeUndefined();
  });

  it('I20: refuses a browser implementation even when a plugin is registered there', () => {
    mocks.platform.mockReturnValue('web');
    expect(nativeSqliteBridge.isAvailable()).toBe(false);
  });

  it('disables per-statement transactions inside the native connection', async () => {
    const connection = await nativeSqliteBridge.connect('woorden_spike_bridge');
    await connection.run('INSERT INTO events (id) VALUES (?);', ['event-1']);
    await connection.execute('PRAGMA user_version = 1;');
    expect(mocks.run).toHaveBeenCalledWith(
      expect.objectContaining({ transaction: false, values: ['event-1'] }),
    );
    expect(mocks.execute).toHaveBeenCalledWith(expect.objectContaining({ transaction: false }));
  });
});
