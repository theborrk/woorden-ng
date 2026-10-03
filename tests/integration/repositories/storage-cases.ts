import type {
  SpikeEvent,
  SpikeProgress,
  SpikeProjectionMeta,
} from '../../../src/infrastructure/db/web/spike-model.ts';

export interface StorageSnapshot {
  events: SpikeEvent[];
  taskProgress: SpikeProgress[];
  projectionMeta: SpikeProjectionMeta[];
}

export type StorageMutation =
  | { type: 'appendEvent'; row: SpikeEvent }
  | { type: 'putProgress'; row: SpikeProgress }
  | { type: 'putMeta'; row: SpikeProjectionMeta };

export type StorageCommand =
  | { type: 'open'; version: 1 | 2; failUpgrade?: true }
  | { type: 'write'; mutations: StorageMutation[]; abort?: true }
  | { type: 'snapshot' }
  | { type: 'eligible'; through: number }
  | { type: 'version' };

export type StorageResult = StorageSnapshot | SpikeProgress[] | number | undefined;

export interface StorageContractDriver {
  execute(command: StorageCommand): Promise<StorageResult>;
  dispose(): Promise<void>;
}

type StorageStep =
  | { command: StorageCommand; expected: StorageResult }
  | { command: StorageCommand; error: { name: string; message?: string } };

interface StorageCase {
  name: string;
  steps: StorageStep[];
}

const instant = 1_791_000_000_123;
const event: SpikeEvent = {
  id: 'event-a',
  kind: 'attempt',
  commitKey: 'profile-a:attempt-a',
  occurredAt: instant,
  payloadJson: '{"grade":3,"source":"scheduled"}',
};
const progress: SpikeProgress = {
  profileId: 'profile-a',
  taskId: 'task-a',
  revision: 1,
  eligibleAt: instant + 60_001,
  projectionVersion: 2,
  stateJson: '{"due":1791000060124,"state":"learning"}',
};
const meta: SpikeProjectionMeta = {
  id: 'learning',
  appliedEventId: event.id,
  projectionVersion: 2,
};
const empty: StorageSnapshot = { events: [], taskProgress: [], projectionMeta: [] };
const committed: StorageSnapshot = {
  events: [event],
  taskProgress: [progress],
  projectionMeta: [meta],
};
const mutations: StorageMutation[] = [
  { type: 'appendEvent', row: event },
  { type: 'putProgress', row: progress },
  { type: 'putMeta', row: meta },
];

function open(version: 1 | 2 = 2): StorageStep {
  return { command: { type: 'open', version }, expected: undefined };
}

function write(rows: StorageMutation[]): StorageStep {
  return { command: { type: 'write', mutations: rows }, expected: undefined };
}

function snapshot(expected: StorageSnapshot): StorageStep {
  return { command: { type: 'snapshot' }, expected };
}

const nonAttemptEvents: SpikeEvent[] = Array.from({ length: 16 }, (_, index) => ({
  id: `exposure-${String(index).padStart(2, '0')}`,
  kind: index % 2 === 0 ? 'exposure' : 'help',
  occurredAt: instant + index,
  payloadJson: '{}',
}));
const updatedProgress = { ...progress, revision: 2, eligibleAt: instant + 120_001 };
// Deliberately insert equal timestamps in reverse primary-key order, across profiles.
const orderedProgress: SpikeProgress[] = [
  { ...progress, taskId: 'task-b', eligibleAt: instant },
  { ...progress, taskId: 'task-z', eligibleAt: instant },
  { ...progress, profileId: 'profile-b', eligibleAt: instant },
  updatedProgress,
];
const v1Progress = { ...progress, projectionVersion: 1 };
const v1Meta = { ...meta, projectionVersion: 1 };
const seedV1: StorageMutation[] = [
  { type: 'appendEvent', row: event },
  { type: 'putProgress', row: v1Progress },
  { type: 'putMeta', row: v1Meta },
];
// Already canonical, sorted-key JSON. Storage must preserve bytes, not serialize it again.
const canonicalJson = String.raw`{"array":[null,true,false,0,1.25,""],"nested":{"a":"de fiets","z":"Zażółć — ё 🚲\n\""},"optional":null}`;
const roundTripInstants = [-1, 0, instant, Number.MAX_SAFE_INTEGER];
const roundTripEvents: SpikeEvent[] = roundTripInstants.map((occurredAt, index) => ({
  id: `round-trip-${index}`,
  kind: 'exposure',
  occurredAt,
  payloadJson: canonicalJson,
}));
const roundTripProgress: SpikeProgress[] = roundTripInstants.map((eligibleAt, index) => ({
  ...progress,
  taskId: `round-trip-${index}`,
  eligibleAt,
  stateJson: canonicalJson,
}));

// Plain commands, fixtures and expectations: a native driver can replay these without Vitest,
// Dexie, fake-indexeddb or browser globals. SQL NULL commit keys normalize to absent properties.
export const storageCases: StorageCase[] = [
  {
    name: 'AC1: a multi-store transaction commits every row and survives reopen',
    steps: [open(), write(mutations), open(), snapshot(committed)],
  },
  {
    name: 'AC1: throwing after all three writes rolls back every row',
    steps: [
      open(),
      {
        command: { type: 'write', mutations, abort: true },
        error: { name: 'Error', message: 'Injected transaction failure' },
      },
      open(),
      snapshot(empty),
    ],
  },
  {
    name: 'AC1: rollback restores existing progress and watermark as well as removing the event',
    steps: [
      open(),
      write(mutations),
      {
        command: {
          type: 'write',
          mutations: [
            { type: 'appendEvent', row: { ...event, id: 'event-b', commitKey: 'attempt-b' } },
            { type: 'putProgress', row: updatedProgress },
            { type: 'putMeta', row: { ...meta, appliedEventId: 'event-b' } },
          ],
          abort: true,
        },
        error: { name: 'Error', message: 'Injected transaction failure' },
      },
      open(),
      snapshot(committed),
    ],
  },
  {
    name: 'AC2: absent commit keys coexist; duplicate commit keys abort the entire transaction',
    steps: [
      open(),
      write([
        { type: 'appendEvent', row: event },
        ...nonAttemptEvents.map((row): StorageMutation => ({ type: 'appendEvent', row })),
      ]),
      {
        command: {
          type: 'write',
          mutations: [
            { type: 'putProgress', row: progress },
            { type: 'putMeta', row: meta },
            { type: 'appendEvent', row: { ...event, id: 'event-b' } },
          ],
        },
        error: { name: 'ConstraintError' },
      },
      open(),
      snapshot({ ...empty, events: [event, ...nonAttemptEvents] }),
    ],
  },
  {
    name: 'AC2: duplicate event IDs are rejected even when commitKey is absent',
    steps: [
      open(),
      write(nonAttemptEvents.map((row) => ({ type: 'appendEvent', row }))),
      {
        command: {
          type: 'write',
          mutations: [{ type: 'appendEvent', row: { ...nonAttemptEvents[0]!, occurredAt: 0 } }],
        },
        error: { name: 'ConstraintError' },
      },
      snapshot({ ...empty, events: nonAttemptEvents }),
    ],
  },
  {
    name: 'AC3: compound-key puts replace one row with the latest revision',
    steps: [
      open(),
      write([{ type: 'putProgress', row: progress }]),
      write([{ type: 'putProgress', row: updatedProgress }]),
      open(),
      snapshot({ ...empty, taskProgress: [updatedProgress] }),
    ],
  },
  {
    name: 'AC3: eligibility index orders by timestamp then compound primary key, including ties',
    steps: [
      open(),
      write([
        { type: 'putProgress', row: orderedProgress[2]! },
        { type: 'putProgress', row: updatedProgress },
        { type: 'putProgress', row: orderedProgress[1]! },
        { type: 'putProgress', row: orderedProgress[0]! },
        {
          type: 'putProgress',
          row: { ...progress, taskId: 'future', eligibleAt: instant + 120_002 },
        },
      ]),
      {
        command: { type: 'eligible', through: updatedProgress.eligibleAt },
        expected: orderedProgress,
      },
      open(),
      {
        command: { type: 'eligible', through: updatedProgress.eligibleAt },
        expected: orderedProgress,
      },
    ],
  },
  {
    name: 'AC4: version 2 upgrades version 1 projections and preserves immutable events',
    steps: [
      open(1),
      write(seedV1),
      { command: { type: 'version' }, expected: 1 },
      open(2),
      { command: { type: 'version' }, expected: 2 },
      snapshot(committed),
      open(2),
      snapshot(committed),
    ],
  },
  {
    name: 'AC4: failed upgrade restores the version and both migrated stores; retry succeeds',
    steps: [
      open(1),
      write(seedV1),
      {
        command: { type: 'open', version: 2, failUpgrade: true },
        error: { name: 'Error', message: 'Injected upgrade failure' },
      },
      open(1),
      { command: { type: 'version' }, expected: 1 },
      snapshot({ events: [event], taskProgress: [v1Progress], projectionMeta: [v1Meta] }),
      open(2),
      { command: { type: 'version' }, expected: 2 },
      snapshot(committed),
    ],
  },
  {
    name: 'AC5: millisecond instants and canonical JSON round-trip unchanged after reopen',
    steps: [
      open(),
      write([
        ...roundTripEvents.map((row): StorageMutation => ({ type: 'appendEvent', row })),
        ...roundTripProgress.map((row): StorageMutation => ({ type: 'putProgress', row })),
      ]),
      open(),
      snapshot({ ...empty, events: roundTripEvents, taskProgress: roundTripProgress }),
      { command: { type: 'eligible', through: instant }, expected: roundTripProgress.slice(0, 3) },
    ],
  },
];
