import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { SpikeDatabase } from '../../../src/infrastructure/db/web/spike.ts';
import type { StorageCommand, StorageContractDriver, StorageResult } from './storage-cases.ts';

export function createWebDriver(): StorageContractDriver {
  // Each case owns its IndexedDB factory: no global patches or shared database state.
  const options = { indexedDB: new IDBFactory(), IDBKeyRange };
  const name = 'woorden-t004-spike';
  let database = new SpikeDatabase(name, 2, options);

  return {
    async execute(command: StorageCommand): Promise<StorageResult> {
      switch (command.type) {
        case 'open':
          database.close();
          database = new SpikeDatabase(name, command.version, options, () => {
            if (command.failUpgrade) throw new Error('Injected upgrade failure');
          });
          await database.open();
          return;
        case 'write':
          await database.transaction(
            'rw',
            [database.events, database.taskProgress, database.projectionMeta],
            async () => {
              for (const mutation of command.mutations) {
                switch (mutation.type) {
                  case 'appendEvent':
                    await database.events.add(mutation.row);
                    break;
                  case 'putProgress':
                    await database.taskProgress.put(mutation.row);
                    break;
                  case 'putMeta':
                    await database.projectionMeta.put(mutation.row);
                    break;
                }
              }
              if (command.abort) throw new Error('Injected transaction failure');
            },
          );
          return;
        case 'snapshot':
          return database.transaction(
            'r',
            [database.events, database.taskProgress, database.projectionMeta],
            async () => ({
              events: await database.events.toArray(),
              taskProgress: await database.taskProgress.toArray(),
              projectionMeta: await database.projectionMeta.toArray(),
            }),
          );
        case 'eligible':
          return database.taskProgress.where('eligibleAt').belowOrEqual(command.through).toArray();
        case 'version':
          return database.verno;
      }
    },
    async dispose() {
      await database.delete();
    },
  };
}
