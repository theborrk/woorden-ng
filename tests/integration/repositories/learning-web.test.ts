// @vitest-environment node
import { Dexie } from 'dexie';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, expect, it } from 'vitest';
import { ProfileDatabase } from '../../../src/infrastructure/db/web/profiles.ts';
import { WebLearningUnitOfWork } from '../../../src/infrastructure/db/web/learning.ts';
import { learningStores } from '../../../src/infrastructure/db/web/learning-schema.ts';
import { createPersistenceService } from '../../../src/application/persistence/service.ts';
import { collections, prepareWrite, sha256 } from '../../../src/application/persistence/model.ts';
import type {
  PersistenceUnitOfWork,
  Progress,
  Repositories,
  Summary,
} from '../../../src/application/persistence/model.ts';
import { validateRecord } from '../../../src/contracts/runtime/records.ts';
import { profileRecord } from '../../../src/application/profiles/service.ts';
import { profile, attemptInput, observation, fixtureId } from './learning-fixtures.ts';
const databases: ProfileDatabase[] = [];
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete();
});
async function setup() {
  const options = { indexedDB: new IDBFactory(), IDBKeyRange };
  const db = new ProfileDatabase('learning', options);
  databases.push(db);
  await db.write(async (repo) => {
    await repo.addProfile(profileRecord(profile));
  });
  const uow = new WebLearningUnitOfWork(db);
  return { db, options, uow, service: createPersistenceService(uow) };
}
const current = async (service: ReturnType<typeof createPersistenceService>): Promise<Progress> => {
  const row = (await service.inspect(profile.id)).records.taskProgress?.[0];
  if (!row || row.record.kind !== 'task_progress') throw new Error('Missing progress');
  return row.record;
};

it('I02: AC1 every prepared collection, counters, outbox and checkpoint survives real Dexie reopen', async () => {
  const { db, options, service } = await setup();
  const plan = await prepareWrite(await attemptInput());
  await expect(service.commit(plan)).resolves.toMatchObject({ status: 'saved' });
  const saved = await service.inspect(profile.id);
  expect(
    await new WebLearningUnitOfWork(db).read((repo) => repo.head(profile.id, plan.taskId!)),
  ).toMatchObject({ revision: 1, parentTransitionId: plan.event.id });
  for (const collection of collections) expect(saved.records[collection]).toHaveLength(1);
  expect(saved.summary).toMatchObject({ events: 1, attempts: 1, watermark: plan.event.order });
  expect(saved.outbox).toMatchObject([
    { id: plan.event.id, hash: plan.event.hash, status: 'pending' },
  ]);
  expect(saved.checkpoint?.summary).toEqual(saved.summary);
  db.close();
  const reopened = new ProfileDatabase('learning', options);
  databases.push(reopened);
  const next = createPersistenceService(new WebLearningUnitOfWork(reopened));
  expect(await next.inspect(profile.id)).toEqual(saved);
  expect(
    await next.eligible(profile.id, Number(saved.records.taskProgress?.[0]?.eligibleAt)),
  ).toEqual([await current(next)]);
});

for (const table of Object.keys(learningStores)) {
  it(`T37: AC1 a rejected ${table} write rolls back every affected table and preserves the draft`, async () => {
    const { db, uow, service } = await setup();
    const plan = await prepareWrite(await attemptInput());
    const pending = plan.changes.find((change) => change.collection === 'drafts');
    if (!pending) throw new Error('Missing draft fixture');
    await uow.write(async (repo) => {
      await repo.putRow('drafts', {
        ...pending.row,
        order: { ...pending.row.order, deviceSequence: 0 },
      });
    });
    const before = await service.inspect(profile.id);
    const fail = () => {
      throw new Error('Injected quota failure');
    };
    db.table(table).hook('creating', fail);
    db.table(table).hook('updating', fail);
    await expect(service.commit(plan)).rejects.toThrow('Injected quota failure');
    expect(await service.inspect(profile.id)).toEqual(before);
    expect(await uow.read((repo) => repo.journals(profile.id))).toEqual([]);
    expect(await uow.read((repo) => repo.head(profile.id, plan.taskId!))).toBeUndefined();
  });
}

it('I18: AC1 failure after every write never acknowledges saved and rolls back summary and history', async () => {
  const { uow, service } = await setup();
  const original = await service.inspect(profile.id);
  const failed: PersistenceUnitOfWork = {
    read: (work) => uow.read(work),
    write: (work) =>
      uow.write(async (repo) => {
        await work(repo);
        throw new Error('Rejected final commit');
      }),
  };
  await expect(
    createPersistenceService(failed).commit(await prepareWrite(await attemptInput())),
  ).rejects.toThrow('Rejected final commit');
  expect(await service.inspect(profile.id)).toEqual(original);
});

it('I02: hashes are prepared outside transactions and repositories cannot escape callbacks', async () => {
  const { uow } = await setup();
  let active = false;
  let escaped: Repositories | undefined;
  const wrapped: PersistenceUnitOfWork = {
    read: (work) => uow.read(work),
    write: (work) =>
      uow.write(async (repo) => {
        active = true;
        escaped = repo;
        try {
          return await work(repo);
        } finally {
          active = false;
        }
      }),
  };
  const hash = async (bytes: Uint8Array) => {
    expect(active).toBe(false);
    return sha256(bytes);
  };
  const service = createPersistenceService(wrapped, hash);
  expect(await service.commit(await prepareWrite(await attemptInput(), hash))).toMatchObject({
    status: 'saved',
  });
  expect(() => escaped?.events(profile.id)).toThrow('transaction has ended');
  await expect(service.commit({} as never)).rejects.toThrow('prepared');
});

it('I02: AC2 identical retries deduplicate while changed event or after-image conflicts retain drafts', async () => {
  const { service } = await setup();
  const input = await attemptInput();
  const plan = await prepareWrite(input);
  await service.commit(plan);
  const saved = await service.inspect(profile.id);
  expect(await service.commit(await prepareWrite(input))).toMatchObject({ status: 'duplicate' });
  const changed = structuredClone(input);
  changed.event.result.final = 'incorrect';
  expect(await service.commit(await prepareWrite(changed))).toMatchObject({
    status: 'conflict',
    reason: 'event ID payload conflict',
  });
  const altered = structuredClone(input);
  altered.records = altered.records.filter((record) => record.kind !== 'user_override');
  expect(await service.commit(await prepareWrite(altered))).toMatchObject({ status: 'conflict' });
  expect(await service.inspect(profile.id)).toEqual(saved);
});

it('I02: AC2 concurrent connections and stale revision/base/parent commands accept at most one', async () => {
  const { db, options, service } = await setup();
  const second = new ProfileDatabase('learning', options);
  databases.push(second);
  const other = createPersistenceService(new WebLearningUnitOfWork(second));
  const first = await prepareWrite(await attemptInput(1));
  const rival = await prepareWrite(await attemptInput(2));
  const results = await Promise.all([service.commit(first), other.commit(rival)]);
  expect(results.filter((result) => result.status === 'saved')).toHaveLength(1);
  const saved = await service.inspect(profile.id);
  const before = await current(service);
  const winner = saved.events[0]!.id;
  const differentBase = { ...before, evidenceStatus: 'needs_support' as const };
  for (const input of [
    await attemptInput(3),
    await attemptInput(3, differentBase, winner),
    await attemptInput(3, before, fixtureId(88)),
  ])
    expect(await service.commit(await prepareWrite(input))).toMatchObject({ status: 'conflict' });
  expect(await service.inspect(profile.id)).toEqual(saved);
  db.close();
});

it('W06: AC3 missing commit keys coexist and the real unique index aborts duplicate attempts', async () => {
  const { service, uow } = await setup();
  for (const n of [4, 2, 3])
    expect(
      await service.commit(await observation(n, n === 2 ? 'assistance' : 'exposure')),
    ).toMatchObject({ status: 'saved' });
  const plan = await prepareWrite(await attemptInput(1));
  await service.commit(plan);
  const saved = await service.inspect(profile.id);
  expect(saved.events.map((row) => row.id)).toEqual([1, 2, 3, 4].map(fixtureId));
  expect(saved.events.filter((row) => row.commitKey === undefined)).toHaveLength(3);
  expect(saved.summary).toMatchObject({ events: 4, exposures: 2, assistance: 1, attempts: 1 });
  await expect(
    uow.write(async (repo) => {
      await repo.putRow('overrides', {
        ...plan.changes.find((change) => change.collection === 'overrides')!.row,
        id: fixtureId(909),
      });
      await repo.appendEvent({ ...plan.event, id: fixtureId(8) });
    }),
  ).rejects.toMatchObject({ name: 'ConstraintError' });
  expect(await service.inspect(profile.id)).toEqual(saved);
});

it('W06: AC3 profile isolation, eligibility ties and canonical bytes survive reopen and key reordering', async () => {
  const { db, uow, service } = await setup();
  const other = fixtureId(555);
  await db.write(async (repo) => {
    await repo.addProfile(profileRecord({ ...profile, id: other }));
  });
  await service.commit(await observation(21, 'exposure', other));
  await uow.write(async (repo) => {
    expect(await repo.profileExists(profile.id)).toBe(true);
  });
  const plan = await prepareWrite(await attemptInput());
  await service.commit(plan);
  expect((await service.inspect(other)).events.map((row) => row.id)).toEqual([fixtureId(21)]);
  expect(await service.eligible(other, 8_640_000_000_000_000)).toEqual([]);
  const input = await attemptInput();
  input.event = Object.fromEntries(Object.entries(input.event).reverse()) as typeof input.event;
  expect((await prepareWrite(input)).event.canonical).toBe(plan.event.canonical);
  expect((await service.inspect(profile.id)).events[0]?.canonical).toContain('ja — I — я');
  const progress = plan.changes[0]!.row;
  if (progress.record.kind !== 'task_progress') throw new Error('Missing progress');
  for (const [n, taskId] of [
    [2, fixtureId(500)],
    [3, fixtureId(400)],
  ] as const) {
    const added = await attemptInput(n);
    const selected = {
      ...added,
      event: { ...added.event, taskId },
      records: [{ ...progress.record, taskId }],
    };
    expect(await service.commit(await prepareWrite(selected))).toMatchObject({ status: 'saved' });
  }
  const eligible = await service.eligible(profile.id, progress.eligibleAt!);
  expect(eligible.map((record) => (record.kind === 'task_progress' ? record.taskId : ''))).toEqual([
    fixtureId(400),
    fixtureId(500),
    progress.id,
  ]);
});

it('W06: AC4 stale projections rebuild from retained after-images without changing history/outbox or invoking hashes', async () => {
  const { db, service, uow } = await setup();
  const plan = await prepareWrite(await attemptInput());
  await service.commit(plan);
  for (const n of [4, 2, 3])
    await service.commit(
      await observation(n, 'exposure', profile.id, await current(service), plan.event.id),
    );
  const saved = await service.inspect(profile.id);
  await db.table('taskProgress').clear();
  await db
    .table<Summary, [string, string]>('projectionMeta')
    .put({ ...saved.summary!, projectionVersion: 0, events: 999 });
  expect((await service.inspect(profile.id)).staleProjection).toBe(true);
  const rebuilt = createPersistenceService(uow, () => {
    throw new Error('Rebuild must not hash/schedule');
  });
  await rebuilt.rebuild(profile.id);
  expect(await service.inspect(profile.id)).toEqual(saved);
});

it('W06: existing version-1 profile data upgrades non-destructively to learning schema 2', async () => {
  const options = { indexedDB: new IDBFactory(), IDBKeyRange };
  const old = new Dexie('upgrade-learning', options);
  old.version(1).stores({ profiles: 'id', preferences: 'profileId', metadata: 'id' });
  await old.table('profiles').add(profile);
  await old.table('metadata').add({
    id: 'installation',
    deviceId: fixtureId(1),
    activeProfileId: profile.id,
    webSchemaVersion: 1,
    logicalFormatVersion: 1,
    projectionVersion: 1,
  });
  old.close();
  const next = new ProfileDatabase('upgrade-learning', options);
  databases.push(next);
  await next.open();
  expect(await next.profiles.get(profile.id)).toEqual(profile);
  expect((await next.metadata.get('installation'))?.webSchemaVersion).toBe(2);
  expect(next.verno).toBe(2);
  expect(
    await createPersistenceService(new WebLearningUnitOfWork(next)).inspect(profile.id),
  ).toMatchObject({ events: [] });
});

it('W06: preparation rejects invalid, cross-profile and invented scheduler after-images before any write', async () => {
  const { service } = await setup();
  const saved = await service.inspect(profile.id);
  const input = await attemptInput();
  await expect(
    prepareWrite({ ...input, event: { ...input.event, unexpected: true } }),
  ).rejects.toThrow();
  await expect(
    prepareWrite({ ...input, records: [{ ...input.records[0], profileId: fixtureId(555) }] }),
  ).rejects.toThrow('cross-profile');
  const progress = validateRecord(input.records[0]);
  if (progress.kind !== 'task_progress' || !progress.scheduler)
    throw new Error('Missing scheduler fixture');
  await expect(
    prepareWrite({
      ...input,
      records: [
        {
          ...progress,
          scheduler: {
            ...progress.scheduler,
            nativeCard: {
              ...progress.scheduler.nativeCard,
              stability: progress.scheduler.nativeCard.stability + 1,
            },
          },
        },
      ],
    }),
  ).rejects.toThrow('unprepared scheduling');
  await expect(prepareWrite({ ...input, records: [] })).rejects.toThrow('requires progress');
  expect(await service.inspect(profile.id)).toEqual(saved);
});

it('I02: a later prepared transition advances the durable revision and parent exactly once', async () => {
  const { service, uow } = await setup();
  const first = await prepareWrite(await attemptInput(1));
  await service.commit(first);
  const second = await prepareWrite(await attemptInput(2, await current(service), first.event.id));
  expect(await service.commit(second)).toMatchObject({ status: 'saved' });
  expect(await service.commit(second)).toMatchObject({ status: 'duplicate' });
  expect((await current(service)).revision).toBe(2);
  expect(await uow.read((repo) => repo.head(profile.id, second.taskId!))).toEqual({
    profileId: profile.id,
    id: second.taskId,
    revision: 2,
    parentTransitionId: second.event.id,
  });
  expect((await service.inspect(profile.id)).summary).toMatchObject({ events: 2, attempts: 2 });
});
