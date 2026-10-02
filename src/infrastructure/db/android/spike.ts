import type { NativeConnection, NativeSqliteBridge, SqlRow } from './bridge';

export interface SpikeEvent {
  id: string;
  commitKey: string | null;
  occurredAt: number;
  payload: string;
}

export interface SpikeProgress {
  profileId: string;
  taskId: string;
  revision: number;
  eligibleAt: number;
}

export interface SpikeWrite {
  event: SpikeEvent;
  progress: SpikeProgress;
}

export interface SpikeSnapshot {
  version: number;
  events: SqlRow[];
  taskProgress: SqlRow[];
  projectionMeta: SqlRow[];
  progressColumns: SqlRow[];
}

const SCHEMA_V1 = `
  CREATE TABLE events (
    id TEXT PRIMARY KEY NOT NULL,
    commitKey TEXT UNIQUE,
    occurredAt INTEGER NOT NULL,
    payload TEXT NOT NULL
  );
  CREATE TABLE taskProgress (
    profileId TEXT NOT NULL,
    taskId TEXT NOT NULL,
    revision INTEGER NOT NULL CHECK (revision >= 0),
    eligibleAt INTEGER NOT NULL,
    PRIMARY KEY (profileId, taskId)
  );
  CREATE INDEX progress_eligibility ON taskProgress (profileId, eligibleAt, taskId);
  CREATE TABLE projectionMeta (
    id TEXT PRIMARY KEY NOT NULL,
    eventId TEXT NOT NULL REFERENCES events(id)
  );
  PRAGMA user_version = 1;
`;

export const MIGRATION_V2 = [
  "ALTER TABLE taskProgress ADD COLUMN activation TEXT NOT NULL DEFAULT 'active';",
  'UPDATE taskProgress SET revision = revision + 1;',
] as const;

async function transaction<T>(connection: NativeConnection, work: () => Promise<T>): Promise<T> {
  await connection.begin();
  try {
    const value = await work();
    await connection.commit();
    return value;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], 'Native SQLite rollback failed.', {
        cause: rollbackError,
      });
    }
    throw error;
  }
}

async function schemaVersion(connection: NativeConnection): Promise<number> {
  const rows = await connection.query('PRAGMA user_version;');
  const version = rows[0]?.['user_version'];
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    throw new Error('Native SQLite returned an invalid schema version.');
  }
  return version;
}

/** Disposable M0 schema; W06 owns the final repository and unit-of-work contracts. */
export async function openSpikeDatabase(
  bridge: NativeSqliteBridge,
  name: string,
  version: 1 | 2 = 2,
  migrationV2: readonly string[] = MIGRATION_V2,
): Promise<SpikeDatabase> {
  if (!bridge.isAvailable()) {
    throw new Error(
      'Native SQLite is unavailable. Data cannot be saved. Restart the app to retry.',
    );
  }
  if (!/^woorden_spike_[a-z0-9_]+$/.test(name)) throw new Error('Invalid spike database name.');
  const connection = await bridge.connect(name);
  try {
    // The plugin enables foreign keys at open. Bound lock waiting before any write begins.
    await connection.execute('PRAGMA busy_timeout = 3000;');
    const current = await schemaVersion(connection);
    if (current > version) throw new Error('Database is newer than this app. Data was preserved.');
    if (current === 0) await transaction(connection, () => connection.execute(SCHEMA_V1));
    if (version === 2 && (await schemaVersion(connection)) === 1) {
      await transaction(connection, async () => {
        for (const statement of migrationV2) await connection.execute(statement);
        await connection.execute('PRAGMA user_version = 2;');
      });
    }
    return new SpikeDatabase(connection);
  } catch (error) {
    try {
      await connection.close();
    } catch (closeError) {
      throw new AggregateError(
        [error, closeError],
        'Native SQLite initialization and close failed.',
        {
          cause: closeError,
        },
      );
    }
    throw error;
  }
}

export class SpikeDatabase {
  private pending: Promise<void> = Promise.resolve();
  private closed = false;

  constructor(private readonly connection: NativeConnection) {}

  private serial<T>(work: () => Promise<T>): Promise<T> {
    const result = this.pending.then(() => {
      if (this.closed) throw new Error('Native SQLite database is closed.');
      return work();
    });
    // Keep the queue usable after a rejected operation; its caller still receives the error.
    this.pending = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private insertEvent(event: SpikeEvent): Promise<void> {
    return this.connection.run(
      'INSERT INTO events (id, commitKey, occurredAt, payload) VALUES (?, ?, ?, ?);',
      [event.id, event.commitKey, event.occurredAt, event.payload],
    );
  }

  write({ event, progress }: SpikeWrite): Promise<void> {
    return this.serial(() =>
      transaction(this.connection, async () => {
        await this.insertEvent(event);
        await this.connection.run(
          `INSERT INTO taskProgress (profileId, taskId, revision, eligibleAt) VALUES (?, ?, ?, ?)
           ON CONFLICT (profileId, taskId) DO UPDATE SET
             revision = excluded.revision, eligibleAt = excluded.eligibleAt;`,
          [progress.profileId, progress.taskId, progress.revision, progress.eligibleAt],
        );
        await this.connection.run(
          `INSERT INTO projectionMeta (id, eventId) VALUES (?, ?)
           ON CONFLICT (id) DO UPDATE SET eventId = excluded.eventId;`,
          ['learning', event.id],
        );
      }),
    );
  }

  appendEvents(events: SpikeEvent[]): Promise<void> {
    return this.serial(() =>
      transaction(this.connection, async () => {
        for (const event of events) await this.insertEvent(event);
      }),
    );
  }

  snapshot(): Promise<SpikeSnapshot> {
    return this.serial(async () => ({
      version: await schemaVersion(this.connection),
      events: await this.connection.query('SELECT * FROM events ORDER BY id;'),
      taskProgress: await this.connection.query(
        'SELECT * FROM taskProgress ORDER BY profileId, eligibleAt, taskId;',
      ),
      projectionMeta: await this.connection.query('SELECT * FROM projectionMeta ORDER BY id;'),
      progressColumns: await this.connection.query('PRAGMA table_info(taskProgress);'),
    }));
  }

  close(): Promise<void> {
    return this.serial(async () => {
      await this.connection.close();
      this.closed = true;
    });
  }
}
