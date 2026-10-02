import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { App } from '../../../app/App';
import { createLocalization } from '../../../i18n';
import { target } from '../../../targets/android';
import { nativeSqliteBridge } from './native-bridge';

const mocks = vi.hoisted(() => ({
  platform: vi.fn(() => 'android'),
  available: vi.fn(() => true),
  create: vi.fn<() => Promise<void>>(),
  open: vi.fn<() => Promise<void>>(),
  close: vi.fn<() => Promise<void>>(),
  query: vi.fn((options: { values?: unknown[] }) => {
    if (!Array.isArray(options.values)) {
      return Promise.reject(new Error('Query: Must provide an Array of Strings'));
    }
    return Promise.resolve({ values: [{ user_version: 2 }] });
  }),
  execute: vi.fn((options: { statements?: string }) => {
    if (options.statements?.includes('PRAGMA busy_timeout')) {
      return Promise.reject(
        new Error('Queries can be performed using query or rawQuery methods only.'),
      );
    }
    return Promise.resolve({ changes: { changes: 0 } });
  }),
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
    cleanup();
    delete window.__storageSpike;
    delete window.Capacitor;
  });

  it('I20: missing plugin surfaces the storage error through Android initialization', async () => {
    mocks.available.mockReturnValue(false);
    await expect(target.initialize()).rejects.toThrow('Data cannot be saved.');
    render(
      createElement(
        I18nextProvider,
        { i18n: createLocalization('en') },
        createElement(App, {
          name: 'Woorden',
          platform: 'android',
          updates: target,
          storage: target,
        }),
      ),
    );
    expect((await screen.findByTestId('storage-error')).textContent).toContain(
      'Data cannot be saved. Restart the app to retry.',
    );
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

  it('passes an explicit empty values array for parameterless native queries', async () => {
    const connection = await nativeSqliteBridge.connect('woorden_spike_query');
    expect(await connection.query('PRAGMA user_version;')).toEqual([{ user_version: 2 }]);
    expect(mocks.query).toHaveBeenCalledExactlyOnceWith({
      database: 'woorden_spike_query',
      readonly: false,
      statement: 'PRAGMA user_version;',
      values: [],
    });
  });

  it('configures the native busy timeout through the result-bearing query API', async () => {
    await target.initialize();
    expect(mocks.query).toHaveBeenCalledWith({
      database: 'woorden_spike_startup',
      readonly: false,
      statement: 'PRAGMA busy_timeout = 3000;',
      values: [],
    });
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});
