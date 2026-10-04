import type { Table } from 'dexie';
import type { ProfileDatabase } from './profiles.ts';
import { learningStores } from './learning-schema.ts';
import type {
  Checkpoint,
  Head,
  Journal,
  Outbox,
  PersistenceUnitOfWork,
  Repositories,
  Row,
  Summary,
} from '../../../application/persistence/model.ts';

export class WebLearningUnitOfWork implements PersistenceUnitOfWork {
  readonly database: ProfileDatabase;
  constructor(database: ProfileDatabase) {
    this.database = database;
  }
  private execute<T>(mode: 'r' | 'rw', work: (repo: Repositories) => Promise<T>) {
    const db = this.database;
    const table = <V>(name: string): Table<V, [string, string]> =>
      db.table<V, [string, string]>(name);
    const events = db.table<Row, string>('events');
    const heads = table<Head>('learningHeads');
    const summary = table<Summary>('projectionMeta');
    const journals = table<Journal>('learningJournals');
    const outbox = table<Outbox>('localOutbox');
    const checkpoints = table<Checkpoint>('learningCheckpoints');
    return db.transaction(
      mode,
      [db.profiles, ...Object.keys(learningStores).map((name) => db.table(name))],
      async () => {
        let active = true;
        const scoped = <V>(action: () => Promise<V>) => {
          if (!active) throw new Error('Repository transaction has ended');
          return action();
        };
        const put = <V>(target: Table<V, [string, string]>, row: V) =>
          scoped(async () => {
            await target.put(row);
          });
        const repo: Repositories = {
          profileExists: (id) => scoped(async () => Boolean(await db.profiles.get(id))),
          event: (id) => scoped(() => events.get(id)),
          byCommitKey: (profileId, key) =>
            scoped(() => events.where('[profileId+commitKey]').equals([profileId, key]).first()),
          eligibleRows: (profileId, through) =>
            scoped(() =>
              table<Row>('taskProgress')
                .where('[profileId+eligibleAt]')
                .between([profileId, -8_640_000_000_000_000], [profileId, through], true, true)
                .toArray(),
            ),
          events: (profileId) =>
            scoped(() => events.where('profileId').equals(profileId).toArray()),
          rows: (collection, profileId) =>
            scoped(() => table<Row>(collection).where('profileId').equals(profileId).toArray()),
          row: (collection, profileId, id) =>
            scoped(() => table<Row>(collection).get([profileId, id])),
          head: (profileId, id) => scoped(() => heads.get([profileId, id])),
          summary: (profileId) => scoped(() => summary.get([profileId, 'summary'])),
          journals: (profileId) =>
            scoped(() => journals.where('profileId').equals(profileId).toArray()),
          journal: (profileId, id) => scoped(() => journals.get([profileId, id])),
          outbox: (profileId) =>
            scoped(() => outbox.where('profileId').equals(profileId).toArray()),
          checkpoint: (profileId) => scoped(() => checkpoints.get([profileId, 'summary'])),
          appendEvent: (row) =>
            scoped(async () => {
              await events.add(row);
            }),
          putRow: (collection, row) => put(table<Row>(collection), row),
          putHead: (row) => put(heads, row),
          putSummary: (row) => put(summary, row),
          putJournal: (row) => put(journals, row),
          putOutbox: (row) => put(outbox, row),
          putCheckpoint: (row) => put(checkpoints, row),
        };
        try {
          return await work(repo);
        } finally {
          active = false;
        }
      },
    );
  }
  read<T>(work: (repo: Repositories) => Promise<T>) {
    return this.execute('r', work);
  }
  write<T>(work: (repo: Repositories) => Promise<T>) {
    return this.execute('rw', work);
  }
}
