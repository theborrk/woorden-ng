import { createProfileService } from '../../../application/profiles/service';
import type { ProfileSnapshot } from '../../../application/profiles/service';
import type { NativeSqliteBridge } from './bridge';
import { NativeProfileDatabase, profileMigrationV2 } from './profiles';

export type ProfileFailure = 'older' | 'missing' | 'open' | 'newer' | 'migration' | 'interrupted';
const key = 'woorden-ng.debug-profile-fixture';
export interface ProfileDebugHarness {
  prepare(mode: ProfileFailure): Promise<ProfileSnapshot>;
  migrationPaused: boolean;
  fixtureRows(): Promise<{ version: number; profiles: unknown[] }>;
}
/** Imported only after the native debug-build guard. Fixtures use a separate private DB. */
export function profileDebugConfiguration(bridge: NativeSqliteBridge) {
  const mode = window.localStorage.getItem(key);
  const name = mode ? 'woorden_ng_profile_fixture' : undefined;
  const selected: NativeSqliteBridge = {
    isAvailable: () => mode !== 'missing' && bridge.isAvailable(),
    connect: (database, readonly) =>
      mode === 'open'
        ? Promise.reject(new Error('Injected native open failure'))
        : bridge.connect(database, readonly),
  };
  const harness: ProfileDebugHarness = {
    async fixtureRows() {
      const connection = await bridge.connect('woorden_ng_profile_fixture', true);
      try {
        const version = (await connection.query('PRAGMA user_version;'))[0]?.['user_version'];
        if (typeof version !== 'number') throw new Error('Missing native version');
        const rows = await connection.query('SELECT record FROM profiles ORDER BY id;');
        return {
          version,
          profiles: rows.map((row) => {
            if (typeof row['record'] !== 'string') throw new Error('Missing native record');
            return JSON.parse(row['record']) as unknown;
          }),
        };
      } finally {
        await connection.close();
      }
    },
    migrationPaused: false,
    async prepare(next) {
      const old = new NativeProfileDatabase(bridge, 'woorden_ng_profile_fixture', 1);
      const service = createProfileService(
        old,
        () => crypto.randomUUID(),
        () => Date.now(),
      );
      const loaded = await service.load('en', 'UTC');
      const saved = await service.save({ ...loaded.preferences, cueLocale: 'pl' });
      await old.close();
      if (next === 'newer') {
        const connection = await bridge.connect('woorden_ng_profile_fixture');
        await connection.execute('PRAGMA user_version = 99;');
        await connection.close();
      }
      window.localStorage.setItem(key, next);
      return saved;
    },
  };
  const database = new NativeProfileDatabase(
    selected,
    name,
    2,
    mode === 'migration'
      ? [...profileMigrationV2, 'INSERT INTO deliberately_missing_table VALUES (1);']
      : profileMigrationV2,
    mode === 'interrupted'
      ? () => {
          harness.migrationPaused = true;
          return new Promise<void>(() => {
            /* Device test terminates the process here, before commit. */
          });
        }
      : undefined,
  );
  return { database, harness };
}
declare global {
  interface Window {
    __nativeProfiles?: ProfileDebugHarness;
  }
}
