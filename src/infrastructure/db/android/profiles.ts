import type {
  LearningUnitOfWork,
  ProfileRepositories,
} from '../../../application/ports/learning-unit-of-work';
import {
  installationRecord,
  preferenceRecord,
  profileRecord,
} from '../../../application/profiles/service';
import type { NativeConnection, NativeSqliteBridge } from './bridge';

export const nativeProfileDatabaseName = 'woorden_ng';
export const nativeProfileSchemaVersion = 2;
import type { RecoveryState, StorageRecovery } from '../../../application/ports/storage-recovery';
export const profileSchemaV1 = `
CREATE TABLE profiles (id TEXT PRIMARY KEY NOT NULL, record TEXT NOT NULL);
CREATE TABLE preferences (profileId TEXT PRIMARY KEY NOT NULL REFERENCES profiles(id), record TEXT NOT NULL);
CREATE TABLE metadata (id TEXT PRIMARY KEY NOT NULL, record TEXT NOT NULL);
PRAGMA user_version = 1;`;
export const profileMigrationV2 = [
  'ALTER TABLE preferences ADD COLUMN revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0);',
  "UPDATE preferences SET revision = json_extract(record, '$.revision');",
  'CREATE INDEX preferences_revision ON preferences(profileId, revision);',
] as const;

export async function nativeVersion(connection: NativeConnection): Promise<number> {
  const version = (await connection.query('PRAGMA user_version;'))[0]?.['user_version'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0)
    throw new Error('Invalid native schema version');
  return version;
}
async function atomic<T>(connection: NativeConnection, work: () => Promise<T>): Promise<T> {
  await connection.begin();
  try {
    const result = await work();
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], 'Rollback failed', { cause: rollbackError });
    }
    throw error;
  }
}

/** Owns one connection and serializes initialization, units of work, exports and close. */
export class NativeProfileDatabase implements LearningUnitOfWork, StorageRecovery {
  private connection: NativeConnection | undefined;
  private pending = Promise.resolve();
  private recovery: RecoveryState | undefined;
  constructor(
    private readonly bridge: NativeSqliteBridge,
    private readonly name = nativeProfileDatabaseName,
    private readonly version: 1 | 2 = nativeProfileSchemaVersion,
    private readonly migration: readonly string[] = profileMigrationV2,
    private readonly migrationCheckpoint?: () => Promise<void>,
  ) {}
  state() {
    return this.recovery;
  }
  private serial<T>(work: () => Promise<T>): Promise<T> {
    const result = this.pending.then(work);
    this.pending = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  private async open(): Promise<NativeConnection> {
    if (this.connection) return this.connection;
    this.recovery = { reason: 'missing', exportSupported: false };
    if (!this.bridge.isAvailable())
      throw new Error('Native SQLite is unavailable. Data cannot be saved.');
    this.recovery = { reason: 'open', exportSupported: false };
    const connection = await this.bridge.connect(this.name);
    try {
      await connection.query('PRAGMA busy_timeout = 3000;');
      await connection.execute('PRAGMA foreign_keys = ON;');
      const current = await nativeVersion(connection);
      if (current > this.version) {
        this.recovery = { reason: 'newer', exportSupported: false };
        throw new Error('Database is newer than this app. Data was preserved.');
      }
      this.recovery = { reason: 'migration', exportSupported: current === 1 || current === 2 };
      // Initial DDL and every subsequent migration share one version/data transaction.
      if (current < this.version)
        await atomic(connection, async () => {
          if (current === 0) await connection.execute(profileSchemaV1);
          if (this.version === 2) {
            for (const statement of this.migration) await connection.execute(statement);
            await this.migrationCheckpoint?.();
            await connection.execute('PRAGMA user_version = 2;');
          }
        });
      this.connection = connection;
      this.recovery = undefined;
      return connection;
    } catch (error) {
      try {
        await connection.close();
      } catch (closeError) {
        throw new AggregateError([error, closeError], 'Initialization and close failed', {
          cause: closeError,
        });
      }
      throw error;
    }
  }
  initialize(): Promise<void> {
    return this.serial(async () => {
      await this.open();
    });
  }
  private execute<T>(write: boolean, work: (repo: ProfileRepositories) => Promise<T>): Promise<T> {
    return this.serial(async () => {
      const connection = await this.open();
      return atomic(connection, async () => {
        let active = true;
        const guard = <R>(action: () => Promise<R>, mutation = false): Promise<R> => {
          if (!active) throw new Error('Repository transaction has ended');
          if (mutation && !write) throw new Error('Read-only unit of work');
          return action();
        };
        const record = async (sql: string, values: string[] = []) => {
          const rows = await connection.query(sql, values);
          const value = rows[0]?.['record'];
          if (value === undefined) return undefined;
          if (typeof value !== 'string') throw new Error('Invalid native record');
          return JSON.parse(value) as unknown;
        };
        const repo: ProfileRepositories = {
          profiles: () =>
            guard(async () =>
              (await connection.query('SELECT record FROM profiles ORDER BY id;')).map((row) => {
                if (typeof row['record'] !== 'string') throw new Error('Invalid native profile');
                return profileRecord(JSON.parse(row['record']) as unknown);
              }),
            ),
          preferences: (profileId) =>
            guard(async () => {
              const value = await record('SELECT record FROM preferences WHERE profileId = ?;', [
                profileId,
              ]);
              return value === undefined ? undefined : preferenceRecord(value);
            }),
          installation: () =>
            guard(async () => {
              const value = await record("SELECT record FROM metadata WHERE id = 'installation';");
              return value === undefined ? undefined : installationRecord(value, '$');
            }),
          addProfile: (value) =>
            guard(async () => {
              const profile = profileRecord(value);
              await connection.run('INSERT INTO profiles(id, record) VALUES (?, ?);', [
                profile.id,
                JSON.stringify(profile),
              ]);
            }, true),
          putPreferences: (value) =>
            guard(async () => {
              const preferences = preferenceRecord(value);
              if (this.version === 1)
                await connection.run(
                  'INSERT INTO preferences(profileId, record) VALUES (?, ?) ON CONFLICT(profileId) DO UPDATE SET record = excluded.record;',
                  [preferences.profileId, JSON.stringify(preferences)],
                );
              else
                await connection.run(
                  'INSERT INTO preferences(profileId, record, revision) VALUES (?, ?, ?) ON CONFLICT(profileId) DO UPDATE SET record = excluded.record, revision = excluded.revision;',
                  [preferences.profileId, JSON.stringify(preferences), preferences.revision],
                );
            }, true),
          putInstallation: (value) =>
            guard(async () => {
              const installation = installationRecord(value, '$');
              await connection.run(
                'INSERT INTO metadata(id, record) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET record = excluded.record;',
                [installation.id, JSON.stringify(installation)],
              );
            }, true),
        };
        try {
          return await work(repo);
        } finally {
          active = false;
        }
      });
    });
  }
  read<T>(work: (repo: ProfileRepositories) => Promise<T>) {
    return this.execute(false, work);
  }
  write<T>(work: (repo: ProfileRepositories) => Promise<T>) {
    return this.execute(true, work);
  }
  close(): Promise<void> {
    return this.serial(async () => {
      if (this.connection) {
        await this.connection.close();
        this.connection = undefined;
      }
    });
  }
  exportProfiles(): Promise<string> {
    return this.serial(async () => {
      if (!this.recovery?.exportSupported)
        throw new Error('Profile export is unavailable for this schema');
      const connection = await this.bridge.connect(this.name, true);
      try {
        const version = await nativeVersion(connection);
        if (version !== 1 && version !== 2) throw new Error('Unsupported export schema');
        // One SELECT is a consistent snapshot on the read-only connection. The plugin's
        // explicit transaction methods address RW connections only.
        const rows = await connection.query(`
          SELECT 'profiles' AS collection, id AS key, record FROM profiles
          UNION ALL SELECT 'preferences', profileId, record FROM preferences
          UNION ALL SELECT 'installation', id, record FROM metadata
          ORDER BY collection, key;`);
        const result: { profiles: unknown[]; preferences: unknown[]; installation: unknown[] } = {
          profiles: [],
          preferences: [],
          installation: [],
        };
        for (const row of rows) {
          if (typeof row['record'] !== 'string') throw new Error('Invalid export record');
          const value: unknown = JSON.parse(row['record']);
          switch (row['collection']) {
            case 'profiles':
              result.profiles.push(profileRecord(value));
              break;
            case 'preferences':
              result.preferences.push(preferenceRecord(value));
              break;
            case 'installation':
              result.installation.push(installationRecord(value, '$'));
              break;
            default:
              throw new Error('Invalid export collection');
          }
        }
        return JSON.stringify(
          { kind: 'local-profile-recovery', nativeSchemaVersion: version, ...result },
          null,
          2,
        );
      } finally {
        await connection.close();
      }
    });
  }
}
