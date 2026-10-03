import { Dexie } from 'dexie';
import type { DexieOptions, Table } from 'dexie';
import type { SpikeEvent, SpikeProgress, SpikeProjectionMeta } from './spike-model.ts';

/** Isolated experiment, deliberately not wired into either application target. */
export class SpikeDatabase extends Dexie {
  readonly events!: Table<SpikeEvent, string>;
  readonly taskProgress!: Table<SpikeProgress, [string, string]>;
  readonly projectionMeta!: Table<SpikeProjectionMeta, string>;

  constructor(
    name: string,
    schemaVersion: 1 | 2 = 2,
    options?: DexieOptions,
    afterUpgrade?: () => void,
  ) {
    super(name, options);
    this.version(1).stores({
      events: 'id,&commitKey',
      taskProgress: '[profileId+taskId],eligibleAt',
      projectionMeta: 'id',
    });

    if (schemaVersion === 2) {
      this.version(2)
        .stores({ taskProgress: '[profileId+taskId],eligibleAt,[profileId+eligibleAt]' })
        .upgrade(async (transaction) => {
          await transaction
            .table<SpikeProgress, [string, string]>('taskProgress')
            .toCollection()
            .modify({ projectionVersion: 2 });
          await transaction
            .table<SpikeProjectionMeta, string>('projectionMeta')
            .toCollection()
            .modify({ projectionVersion: 2 });
          // The test hook fails after both data changes, exercising upgrade rollback.
          afterUpgrade?.();
        });
    }
  }
}
