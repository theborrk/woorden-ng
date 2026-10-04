// @vitest-environment node
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, expect, it } from 'vitest';
import { ProfileDatabase } from './profiles';
import { createProfileService } from '../../../application/profiles/service';
import type {
  LearningUnitOfWork,
  ProfileRepositories,
} from '../../../application/ports/learning-unit-of-work';
import { validateRecord } from '../../../contracts/runtime/records';

const databases: ProfileDatabase[] = [];
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete();
});
function setup(uow?: (db: ProfileDatabase) => LearningUnitOfWork) {
  const options = { indexedDB: new IDBFactory(), IDBKeyRange };
  const db = new ProfileDatabase('test-profiles', options);
  databases.push(db);
  let sequence = 0;
  const service = createProfileService(
    uow?.(db) ?? db,
    () => `10000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
    () => 1000,
  );
  return { db, options, service };
}
it('I18: AC1 real Dexie profile, installation ID, versions and preferences survive reopening', async () => {
  const { db, options, service } = setup();
  const initial = await service.load('en', 'Europe/Amsterdam');
  expect(initial.preferences).toMatchObject({
    dailyNewConceptBudget: 2,
    studyDayBoundaryMinutes: 360,
  });
  const created = await service.create('Profile A', 'pl', 'Europe/Warsaw');
  const saved = await service.save({ ...created.preferences, dailyNewConceptBudget: 0 });
  expect(saved.preferences.revision).toBe(1);
  expect(saved.installation.deviceId).toBe(initial.installation.deviceId);
  expect(saved.installation).toMatchObject({
    webSchemaVersion: 2,
    logicalFormatVersion: 1,
    projectionVersion: 1,
  });
  db.close();
  const reopened = new ProfileDatabase('test-profiles', options);
  databases.push(reopened);
  const next = createProfileService(
    reopened,
    () => {
      throw new Error('Must not allocate on reopen');
    },
    () => 2000,
  );
  expect(await next.load('en', 'UTC')).toEqual(saved);
  await expect(next.select(initial.preferences.profileId)).resolves.toMatchObject({
    preferences: initial.preferences,
  });
});
it('I14: AC2 interface preference edits preserve PL cue contracts and historical task locale', async () => {
  const { service } = setup();
  const initial = await service.load('pl', 'UTC');
  const historical = validateRecord({
    formatVersion: 1,
    kind: 'task_definition',
    taskVersion: 1,
    id: '20000000-0000-4000-8000-000000000001',
    senseId: '20000000-0000-4000-8000-000000000002',
    lexemeId: '20000000-0000-4000-8000-000000000003',
    skill: 'productive',
    cueFamily: 'translation',
    cueLocale: 'pl',
    gradingContractId: '20000000-0000-4000-8000-000000000004',
    gradingContractVersion: 1,
    contentVersion: 'fixture',
    promptVariantIds: ['20000000-0000-4000-8000-000000000005'],
  });
  const before = JSON.stringify(historical);
  const saved = await service.save({ ...initial.preferences, interfaceLocale: 'en' });
  expect(saved.preferences).toMatchObject({ interfaceLocale: 'en', cueLocale: 'pl' });
  expect(JSON.stringify(historical)).toBe(before);
});
it('I18: AC4 invalid values, stale revisions and abort after writes preserve all prior rows', async () => {
  const { db, service } = setup();
  const initial = await service.load('en', 'UTC');
  expect(() => service.save({ ...initial.preferences, timeZone: 'Invalid/Zone' })).toThrow();
  expect(() => service.save({ ...initial.preferences, dailyNewConceptBudget: -1 })).toThrow();
  const fail: LearningUnitOfWork = {
    read: (work) => db.read(work),
    write: (work) =>
      db.write(async (repo) => {
        await work(repo);
        throw new Error('Rejected commit');
      }),
  };
  const failing = createProfileService(
    fail,
    () => '30000000-0000-4000-8000-000000000001',
    () => 2000,
  );
  await expect(failing.save({ ...initial.preferences, cueLocale: 'pl' })).rejects.toThrow(
    'Rejected commit',
  );
  await expect(failing.create('Profile B', 'pl', 'UTC')).rejects.toThrow('Rejected commit');
  expect(await service.load('pl', 'UTC')).toEqual(initial);
  const updated = await service.save({ ...initial.preferences, cueLocale: 'pl' });
  await expect(service.save(initial.preferences)).rejects.toThrow('Preferences changed');
  expect(await service.load('en', 'UTC')).toEqual(updated);
});
it('W06: repositories cannot escape their transaction and unsupported metadata never resets data', async () => {
  const { db, service } = setup();
  const initial = await service.load('en', 'UTC');
  let escaped: ProfileRepositories | undefined;
  await db.read(async (repo) => {
    await repo.installation();
    escaped = repo;
  });
  expect(() => escaped?.profiles()).toThrow('transaction has ended');
  await db.metadata.put({
    ...initial.installation,
    logicalFormatVersion: 2,
  } as unknown as typeof initial.installation);
  await expect(service.load('en', 'UTC')).rejects.toThrow('expected one of 1');
  expect(await db.profiles.toArray()).toEqual(initial.profiles);
  expect(await db.preferences.toArray()).toEqual([initial.preferences]);
});
