import type { Page } from '@playwright/test';
import type { SpikeEvent, SpikeWrite } from '../src/infrastructure/db/android/spike';
import { expect, launchApp, snapDevice, test } from './support/device';

const write: SpikeWrite = {
  event: {
    id: 'event-1',
    commitKey: 'profile-1:attempt-1',
    occurredAt: 1_791_000_000_123,
    payload: '{"a":[null,true,1],"word":"één"}',
  },
  progress: {
    profileId: 'profile-1',
    taskId: 'task-1',
    revision: 8,
    eligibleAt: 1_791_100_000_789,
  },
};

async function open(page: Page, name: string, version: 1 | 2 = 1): Promise<void> {
  await expect.poll(() => page.evaluate(() => window.__storageSpike !== undefined)).toBe(true);
  // Fail if this isn't the real debug APK. The harness itself also requires the native plugin.
  expect(await page.evaluate(() => window.Capacitor?.DEBUG)).toBe(true);
  await page.evaluate(
    async ({ name, version }) => {
      if (!window.__storageSpike) throw new Error('Native storage test handle is missing.');
      await window.__storageSpike.open(name, version);
    },
    { name, version },
  );
}

async function snapshot(page: Page) {
  return page.evaluate(() => {
    if (!window.__storageSpike) throw new Error('Native storage test handle is missing.');
    return window.__storageSpike.snapshot();
  });
}

async function save(page: Page, input: SpikeWrite): Promise<void> {
  await page.evaluate((input) => {
    if (!window.__storageSpike) throw new Error('Native storage test handle is missing.');
    return window.__storageSpike.write(input);
  }, input);
}

test('AC1: native multi-table commit survives an app restart @repositories', async ({
  app,
  device,
}) => {
  await open(app, 'woorden_spike_commit');
  await save(app, write);
  const stored = await snapshot(app);
  expect(stored.events).toEqual([write.event]);
  expect(stored.taskProgress).toEqual([write.progress]);
  expect(stored.projectionMeta).toEqual([{ id: 'learning', eventId: write.event.id }]);

  // Deliberately don't close the DB: kill the app after its commit acknowledgement.
  const restarted = await launchApp(device, { clearData: false });
  await open(restarted, 'woorden_spike_commit');
  expect(await snapshot(restarted)).toEqual(stored);
  await snapDevice(device, 'sqlite-commit-restart');
});

test('AC2: native failure after the first write rolls back across restart @repositories', async ({
  app,
  device,
}) => {
  await open(app, 'woorden_spike_rollback');
  await save(app, write);
  const before = await snapshot(app);
  // The second SQL write fails its CHECK constraint after the event INSERT succeeded.
  await expect(
    save(app, {
      event: { ...write.event, id: 'rolled-back', commitKey: 'profile-1:attempt-2' },
      progress: { ...write.progress, revision: -1 },
    }),
  ).rejects.toThrow(/CHECK|constraint/i);
  expect(await snapshot(app)).toEqual(before);

  const restarted = await launchApp(device, { clearData: false });
  await open(restarted, 'woorden_spike_rollback');
  expect(await snapshot(restarted)).toEqual(before);
  await snapDevice(device, 'sqlite-rollback-restart');
});

test('AC3: SQL NULL commit keys coexist and duplicate non-NULL keys fail @repositories', async ({
  app,
  device,
}) => {
  await open(app, 'woorden_spike_keys');
  const events: SpikeEvent[] = Array.from({ length: 20 }, (_, index) => ({
    ...write.event,
    id: `exposure-${String(index).padStart(2, '0')}`,
    commitKey: null,
  }));
  await app.evaluate((events) => window.__storageSpike!.appendEvents(events), events);
  await save(app, write);
  const before = await snapshot(app);
  expect(before.events).toEqual([write.event, ...events]);
  await expect(
    save(app, {
      ...write,
      event: { ...write.event, id: 'duplicate-commit-key' },
    }),
  ).rejects.toThrow(/UNIQUE|commitKey/i);
  expect(await snapshot(app)).toEqual(before);
  await snapDevice(device, 'sqlite-null-commit-keys');
});

test('AC4: opening version 2 migrates version 1 data durably @repositories', async ({
  app,
  device,
}) => {
  await open(app, 'woorden_spike_upgrade');
  await save(app, write);
  await open(app, 'woorden_spike_upgrade', 2);
  const migrated = await snapshot(app);
  expect(migrated.version).toBe(2);
  expect(migrated.events).toEqual([write.event]);
  expect(migrated.taskProgress).toEqual([{ ...write.progress, revision: 9, activation: 'active' }]);
  expect(migrated.projectionMeta).toEqual([{ id: 'learning', eventId: write.event.id }]);

  const restarted = await launchApp(device, { clearData: false });
  await open(restarted, 'woorden_spike_upgrade', 2);
  expect(await snapshot(restarted)).toEqual(migrated);
  await snapDevice(device, 'sqlite-migration');
});

test('AC4: a failed version 2 migration preserves version 1 schema and data @repositories', async ({
  app,
  device,
}) => {
  await open(app, 'woorden_spike_failed_upgrade');
  await save(app, write);
  const before = await snapshot(app);
  await expect(
    app.evaluate(() => window.__storageSpike!.open('woorden_spike_failed_upgrade', 2, true)),
  ).rejects.toThrow(/deliberately_missing_table/i);
  await open(app, 'woorden_spike_failed_upgrade');
  expect(await snapshot(app)).toEqual(before);

  const restarted = await launchApp(device, { clearData: false });
  await open(restarted, 'woorden_spike_failed_upgrade');
  expect(await snapshot(restarted)).toEqual(before);
  // The failed ALTER/UPDATE left no partial column, version bump, or data change.
  await open(restarted, 'woorden_spike_failed_upgrade', 2);
  expect((await snapshot(restarted)).taskProgress).toEqual([
    { ...write.progress, revision: 9, activation: 'active' },
  ]);
  await snapDevice(device, 'sqlite-failed-migration');
});

test('AC5: millisecond integers and canonical JSON round-trip unchanged @repositories', async ({
  app,
  device,
}) => {
  await open(app, 'woorden_spike_values');
  const events = [-1, 0, 1_791_000_000_123, Number.MAX_SAFE_INTEGER].map((occurredAt, index) => ({
    id: `value-${String(index)}`,
    commitKey: null,
    occurredAt,
    payload: JSON.stringify({ a: [null, true, false, 0, 1.25], text: 'één\n"woord" 🦉' }),
  }));
  await app.evaluate((events) => window.__storageSpike!.appendEvents(events), events);
  expect((await snapshot(app)).events).toEqual(events);
  const restarted = await launchApp(device, { clearData: false });
  await open(restarted, 'woorden_spike_values');
  expect((await snapshot(restarted)).events).toEqual(events);
  await snapDevice(device, 'sqlite-value-roundtrips');
});
