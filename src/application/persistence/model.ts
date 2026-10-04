import { canonicalRecord } from '../../contracts/runtime/canonical.ts';
import { validateRecord } from '../../contracts/runtime/records.ts';
import type { RuntimeRecord } from '../../contracts/runtime/records.ts';
import {
  check,
  count,
  enumeration,
  hash as hashValue,
  id,
  nullable,
  object,
  text,
} from '../../contracts/runtime/schema.ts';

export type StudyEvent = Extract<RuntimeRecord, { eventVersion: 1 }>;
export type Progress = Extract<RuntimeRecord, { kind: 'task_progress' }>;
export const collections = [
  'taskProgress',
  'taskDefinitions',
  'enrollments',
  'sessions',
  'drafts',
  'overrides',
  'parameterSets',
] as const;
export type Collection = (typeof collections)[number];
const kinds = {
  task_progress: 'taskProgress',
  task_definition: 'taskDefinitions',
  enrollment: 'enrollments',
  session: 'sessions',
  attempt_draft: 'drafts',
  parameter_set: 'parameterSets',
} as const;
const overrideSchema = object({
  formatVersion: enumeration(1),
  kind: enumeration('user_override'),
  overrideVersion: enumeration(1),
  id,
  profileId: id,
  revision: count,
  valueJson: text,
});
export type Override = ReturnType<typeof overrideSchema>;
export type Entity = RuntimeRecord | Override;
export type Hash = (bytes: Uint8Array) => Promise<string>;
export const sha256: Hash = async (bytes) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer))]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
export const nullBytes = new TextEncoder().encode('null');
export interface Order {
  occurredAt: number;
  deviceId: string;
  deviceSequence: number;
  id: string;
}
export const orderOf = (event: StudyEvent): Order => ({
  occurredAt: event.occurredAt,
  deviceId: event.deviceId,
  deviceSequence: event.deviceSequence,
  id: event.id,
});
const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export const compareOrder = (a: Order, b: Order) =>
  a.occurredAt - b.occurredAt ||
  compareText(a.deviceId, b.deviceId) ||
  a.deviceSequence - b.deviceSequence ||
  compareText(a.id, b.id);
export interface Row {
  profileId: string;
  id: string;
  record: Entity;
  canonical: string;
  hash: string;
  revision: number;
  order: Order;
  eligibleAt?: number;
  commitKey?: string;
}
export interface Head {
  profileId: string;
  id: string;
  revision: number;
  parentTransitionId: string | null;
}
export interface Summary {
  profileId: string;
  id: 'summary';
  projectionVersion: number;
  events: number;
  attempts: number;
  exposures: number;
  assistance: number;
  watermark: Order | null;
}
export interface Change {
  collection: Collection;
  row: Row;
}
export interface PreparedWrite {
  event: Row;
  beforeHash: string;
  expectedRevision: number;
  expectedParent: string | null;
  taskId: string | null;
  changes: Change[];
  writeHash: string;
}
export interface Journal extends PreparedWrite {
  profileId: string;
  id: string;
  projectionVersion: 1;
}
export interface Outbox {
  profileId: string;
  id: string;
  canonical: string;
  hash: string;
  status: 'pending';
}
export interface Checkpoint {
  profileId: string;
  id: 'summary';
  projectionVersion: 1;
  summary: Summary;
}
export interface Repositories {
  profileExists(profileId: string): Promise<boolean>;
  event(id: string): Promise<Row | undefined>;
  byCommitKey(profileId: string, commitKey: string): Promise<Row | undefined>;
  events(profileId: string): Promise<Row[]>;
  eligibleRows(profileId: string, through: number): Promise<Row[]>;
  rows(collection: Collection, profileId: string): Promise<Row[]>;
  row(collection: Collection, profileId: string, id: string): Promise<Row | undefined>;
  head(profileId: string, taskId: string): Promise<Head | undefined>;
  summary(profileId: string): Promise<Summary | undefined>;
  journals(profileId: string): Promise<Journal[]>;
  journal(profileId: string, eventId: string): Promise<Journal | undefined>;
  outbox(profileId: string): Promise<Outbox[]>;
  checkpoint(profileId: string): Promise<Checkpoint | undefined>;
  appendEvent(row: Row): Promise<void>;
  putRow(collection: Collection, row: Row): Promise<void>;
  putHead(head: Head): Promise<void>;
  putSummary(summary: Summary): Promise<void>;
  putJournal(journal: Journal): Promise<void>;
  putOutbox(outbox: Outbox): Promise<void>;
  putCheckpoint(checkpoint: Checkpoint): Promise<void>;
}
export interface PersistenceUnitOfWork {
  read<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
  write<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
}
const prepared = new WeakSet<PreparedWrite>();
export const assertPrepared = (value: PreparedWrite) =>
  check('$', prepared.has(value), 'write must be prepared and validated before transaction');
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export function entity(value: unknown): Entity {
  if (value && typeof value === 'object' && 'kind' in value && value.kind === 'user_override') {
    const record = overrideSchema(value, '$');
    JSON.parse(record.valueJson); // Opaque private JSON; the future feature owns field semantics/rendering.
    return record;
  }
  return validateRecord(value);
}
export async function stateHash(value: unknown, hash: Hash = sha256) {
  return hashValue(
    await hash(value === null ? nullBytes : canonicalRecord(value).bytes),
    '$/stateHash',
  );
}
/** Prepare every byte/hash and validated after-image before opening the storage transaction. */
export async function prepareWrite(
  input: { event: unknown; before: unknown; parentTransitionId: unknown; records: unknown[] },
  hash: Hash = sha256,
): Promise<PreparedWrite> {
  const digest: Hash = async (bytes) => hashValue(await hash(bytes), '$/hash');
  const event = validateRecord(input.event);
  check('$/event', 'eventVersion' in event, 'expected study event');
  const before = input.before === null ? null : validateRecord(input.before);
  check('$/before', before === null || before.kind === 'task_progress', 'expected task progress');
  const taskId = 'taskId' in event ? event.taskId : null;
  check(
    '$/before',
    !before || (before.profileId === event.profileId && before.taskId === taskId),
    'base scope mismatch',
  );
  const expectedParent = nullable(id)(input.parentTransitionId, '$/parentTransitionId');
  const beforeHash = await stateHash(before, digest);
  const expectedRevision = before?.revision ?? 0;
  const eventBytes = canonicalRecord(event);
  const eventRow: Row = {
    profileId: event.profileId,
    id: event.id,
    record: event,
    canonical: eventBytes.canonical,
    hash: await digest(eventBytes.bytes),
    revision: 0,
    order: orderOf(event),
    ...('commitKey' in event ? { commitKey: event.commitKey } : {}),
  };
  const changes: Change[] = [];
  const seen = new Set<string>();
  for (const value of input.records) {
    const record = entity(value);
    const collection =
      record.kind === 'user_override'
        ? 'overrides'
        : record.kind in kinds
          ? kinds[record.kind as keyof typeof kinds]
          : null;
    check('$/records', collection !== null, 'unsupported projection record');
    check(
      '$/records/profileId',
      !('profileId' in record) || record.profileId === event.profileId,
      'cross-profile mutation',
    );
    const key =
      'id' in record
        ? record.id
        : 'taskId' in record
          ? record.taskId
          : 'senseId' in record
            ? record.senseId
            : null;
    check(
      '$/records',
      key !== null && !seen.has(`${collection}:${key}`),
      'missing/duplicate projection key',
    );
    seen.add(`${collection}:${key}`);
    const canonical =
      record.kind === 'user_override'
        ? JSON.stringify(
            Object.fromEntries(Object.entries(record).sort(([a], [b]) => compareText(a, b))),
          )
        : canonicalRecord(record).canonical;
    const row: Row = {
      profileId: event.profileId,
      id: key,
      record,
      canonical,
      hash: await digest(new TextEncoder().encode(canonical)),
      revision: 'revision' in record ? record.revision : 0,
      order: orderOf(event),
      ...(record.kind === 'task_progress' ? { eligibleAt: record.eligibility.eligibleAt } : {}),
    };
    if (record.kind === 'task_progress') {
      check(
        '$/records/taskId',
        record.taskId === taskId && record.revision === expectedRevision + 1,
        'progress must advance the checked task by one revision',
      );
      const scheduling = event.kind === 'attempt_committed' ? event.scheduling : null;
      check(
        '$/records/scheduler',
        JSON.stringify(record.scheduler) ===
          JSON.stringify(scheduling?.after ?? before?.scheduler ?? null),
        'unprepared scheduling change',
      );
      if (scheduling)
        check(
          '$/records/eligibility',
          JSON.stringify(record.eligibility) === JSON.stringify(scheduling.eligibilityAfter),
          'eligibility differs from prepared transition',
        );
    }
    changes.push({ collection, row });
  }
  if (event.kind === 'attempt_committed') {
    check(
      '$/event/expectedTaskRevision',
      event.expectedTaskRevision === expectedRevision,
      'base revision mismatch',
    );
    check(
      '$/event/expectedStateHash',
      event.expectedStateHash === beforeHash,
      'canonical base hash mismatch',
    );
    check(
      '$/event/parentTransitionId',
      event.parentTransitionId === expectedParent,
      'parent mismatch',
    );
    if (event.scheduling) {
      check(
        '$/event/scheduling/before',
        JSON.stringify(event.scheduling.before) === JSON.stringify(before?.scheduler ?? null),
        'scheduler base mismatch',
      );
      check(
        '$/records',
        changes.some((change) => change.collection === 'taskProgress'),
        'scheduled transition requires progress',
      );
    }
  }
  const result = {
    event: eventRow,
    beforeHash,
    expectedRevision,
    expectedParent,
    taskId,
    changes,
    writeHash: '',
  };
  result.writeHash = await digest(new TextEncoder().encode(JSON.stringify(result)));
  freeze(result);
  prepared.add(result);
  return result;
}
