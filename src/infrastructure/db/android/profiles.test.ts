import { expect, it, vi } from 'vitest';
import type { NativeConnection, NativeSqliteBridge } from './bridge';
import { NativeProfileDatabase } from './profiles';

function fixture(version = 2) {
  const connection = {
    query: vi.fn((sql: string) =>
      Promise.resolve(sql === 'PRAGMA user_version;' ? [{ user_version: version }] : []),
    ),
    execute: vi.fn<NativeConnection['execute']>(() => Promise.resolve()),
    run: vi.fn<NativeConnection['run']>(() => Promise.resolve()),
    begin: vi.fn(() => Promise.resolve()),
    commit: vi.fn(() => Promise.resolve()),
    rollback: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  } satisfies NativeConnection;
  const bridge = {
    isAvailable: (): boolean => true,
    connect: vi.fn<NativeSqliteBridge['connect']>(() => Promise.resolve(connection)),
  } satisfies NativeSqliteBridge;
  return { connection, bridge, db: new NativeProfileDatabase(bridge) };
}
it('I20: AC2 missing, open and newer errors preserve storage and permit retry without a fallback', async () => {
  const { connection, bridge } = fixture(99);
  const available = vi.fn(() => false);
  bridge.isAvailable = available;
  const db = new NativeProfileDatabase(bridge);
  await expect(db.initialize()).rejects.toThrow('unavailable');
  expect(db.state()).toEqual({ reason: 'missing', exportSupported: false });
  expect(bridge.connect).not.toHaveBeenCalled();
  available.mockReturnValue(true);
  vi.mocked(bridge.connect).mockRejectedValueOnce(new Error('Cannot open'));
  await expect(db.initialize()).rejects.toThrow('Cannot open');
  expect(db.state()?.reason).toBe('open');
  await expect(db.initialize()).rejects.toThrow('newer');
  expect(db.state()).toEqual({ reason: 'newer', exportSupported: false });
  expect(connection.begin).not.toHaveBeenCalled();
  expect(connection.close).toHaveBeenCalledOnce();
  await expect(db.exportProfiles()).rejects.toThrow('unavailable');
});
it('T63: AC3 migration failure rolls back DDL/data/version and allows read-only logical recovery', async () => {
  const { connection, bridge } = fixture(1);
  const db = new NativeProfileDatabase(bridge, undefined, 2, [
    'ALTER TABLE preferences ADD COLUMN revision INTEGER;',
    'FAIL',
  ]);
  vi.mocked(connection.execute).mockImplementation((sql) => {
    if (sql === 'FAIL') return Promise.reject(new Error('Migration failed'));
    return Promise.resolve();
  });
  await expect(db.initialize()).rejects.toThrow('Migration failed');
  expect(connection.rollback).toHaveBeenCalledOnce();
  expect(connection.commit).not.toHaveBeenCalled();
  expect(connection.execute).not.toHaveBeenCalledWith('PRAGMA user_version = 2;');
  expect(connection.close).toHaveBeenCalledOnce();
  expect(db.state()).toEqual({ reason: 'migration', exportSupported: true });
  const exported: unknown = JSON.parse(await db.exportProfiles());
  expect(exported).toEqual({
    kind: 'local-profile-recovery',
    nativeSchemaVersion: 1,
    profiles: [],
    preferences: [],
    installation: [],
  });
  expect(bridge.connect).toHaveBeenLastCalledWith('woorden_ng', true);
  expect(connection.begin).toHaveBeenCalledOnce(); // Export uses one read-only SELECT.
});
it('I20: serialized reads reject escaped repositories and do not permit writes', async () => {
  const { db, connection, bridge } = fixture();
  await Promise.all([db.initialize(), db.initialize()]);
  expect(bridge.connect).toHaveBeenCalledOnce();
  const escaped = await db.read((repo) => Promise.resolve(repo));
  expect(() => escaped.profiles()).toThrow('ended');
  await expect(
    db.read((repo) =>
      repo.putInstallation({
        id: 'installation',
        deviceId: '10000000-0000-4000-8000-000000000002',
        activeProfileId: null,
        webSchemaVersion: 2,
        logicalFormatVersion: 1,
        projectionVersion: 1,
      }),
    ),
  ).rejects.toThrow('Read-only');
  expect(connection.run).not.toHaveBeenCalled();
  expect(connection.rollback).toHaveBeenCalledOnce();
  await db.read((repo) => repo.profiles());
  expect(connection.commit).toHaveBeenCalledTimes(2);
});
