import type { NativeSqliteBridge } from './bridge';
import {
  MIGRATION_V2,
  openSpikeDatabase,
  type SpikeDatabase,
  type SpikeEvent,
  type SpikeWrite,
} from './spike';

export interface StorageSpikeHarness {
  open(name: string, version: 1 | 2, failMigration?: boolean): Promise<void>;
  close(): Promise<void>;
  write(input: SpikeWrite): Promise<void>;
  appendEvents(events: SpikeEvent[]): Promise<void>;
  snapshot(): ReturnType<SpikeDatabase['snapshot']>;
}

export function createStorageSpikeHarness(bridge: NativeSqliteBridge): StorageSpikeHarness {
  let database: SpikeDatabase | undefined;
  function current(): SpikeDatabase {
    if (!database) throw new Error('Open a spike database first.');
    return database;
  }
  return {
    async open(name, version, failMigration = false) {
      if (database) await database.close();
      database = undefined;
      const migration = failMigration
        ? [...MIGRATION_V2, 'INSERT INTO deliberately_missing_table (id) VALUES (1);']
        : MIGRATION_V2;
      database = await openSpikeDatabase(bridge, name, version, migration);
    },
    async close() {
      await current().close();
      database = undefined;
    },
    write: (input) => current().write(input),
    appendEvents: (events) => current().appendEvents(events),
    snapshot: () => current().snapshot(),
  };
}

declare global {
  interface Window {
    __storageSpike?: StorageSpikeHarness;
  }
}
