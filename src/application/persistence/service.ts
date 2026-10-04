import { canonicalRecord } from '../../contracts/runtime/canonical.ts';
import { validateRecord } from '../../contracts/runtime/records.ts';
import { check, id, instant } from '../../contracts/runtime/schema.ts';
import { assertPrepared, collections, compareOrder, nullBytes, orderOf, sha256 } from './model.ts';
import type {
  Change,
  Hash,
  PersistenceUnitOfWork,
  PreparedWrite,
  Repositories,
  Row,
  StudyEvent,
  Summary,
} from './model.ts';

export type WriteResult =
  | { status: 'saved' | 'duplicate'; eventId: string }
  | { status: 'conflict'; eventId: string; reason: string };
const studyEvent = (row: Row): StudyEvent => {
  const record = validateRecord(row.record);
  check(
    '$',
    'eventVersion' in record && canonicalRecord(record).canonical === row.canonical,
    'corrupt event row',
  );
  check(
    '$',
    record.profileId === row.profileId &&
      record.id === row.id &&
      JSON.stringify(orderOf(record)) === JSON.stringify(row.order),
    'corrupt event identity/order',
  );
  return record;
};
const newer = (left: Row, right: Row) =>
  left.revision > right.revision ||
  (left.revision === right.revision && compareOrder(left.order, right.order) > 0);
const emptySummary = (profileId: string): Summary => ({
  profileId,
  id: 'summary',
  projectionVersion: 1,
  events: 0,
  attempts: 0,
  exposures: 0,
  assistance: 0,
  watermark: null,
});
function addSummary(summary: Summary, row: Row): Summary {
  const event = studyEvent(row);
  return {
    ...summary,
    events: summary.events + 1,
    attempts: summary.attempts + Number(event.kind === 'attempt_committed'),
    exposures: summary.exposures + Number(event.kind === 'exposure'),
    assistance: summary.assistance + Number(event.kind === 'assistance'),
    watermark:
      !summary.watermark || compareOrder(row.order, summary.watermark) > 0
        ? row.order
        : summary.watermark,
  };
}
async function putChange(repo: Repositories, change: Change) {
  const old = await repo.row(change.collection, change.row.profileId, change.row.id);
  if (!old || newer(change.row, old)) await repo.putRow(change.collection, change.row);
}
export function createPersistenceService(uow: PersistenceUnitOfWork, hash: Hash = sha256) {
  // The empty-base digest is resolved before transaction entry, never while IndexedDB is live.

  return {
    async commit(write: PreparedWrite): Promise<WriteResult> {
      assertPrepared(write);
      const absentHash = await hash(nullBytes);
      return uow.write(async (repo) => {
        const profileId = write.event.profileId;
        const conflict = (reason: string): WriteResult => ({
          status: 'conflict',
          eventId: write.event.id,
          reason,
        });
        if (!(await repo.profileExists(profileId))) return conflict('unknown profile');
        const old = await repo.event(write.event.id);
        if (old) {
          const journal = await repo.journal(profileId, write.event.id);
          return old.hash === write.event.hash &&
            old.canonical === write.event.canonical &&
            journal?.writeHash === write.writeHash
            ? { status: 'duplicate', eventId: old.id }
            : conflict('event ID payload conflict');
        }
        if (write.event.commitKey && (await repo.byCommitKey(profileId, write.event.commitKey)))
          return conflict('attempt already committed');
        const summary = (await repo.summary(profileId)) ?? emptySummary(profileId);
        check('$', summary.projectionVersion === 1, 'projection rebuild required');
        if (write.taskId) {
          const progress = await repo.row('taskProgress', profileId, write.taskId);
          const head = await repo.head(profileId, write.taskId);
          if ((progress?.revision ?? 0) !== write.expectedRevision)
            return conflict('stale revision');
          if ((progress?.hash ?? absentHash) !== write.beforeHash)
            return conflict('different canonical base');
          if (head && head.revision !== (progress?.revision ?? 0))
            return conflict('inconsistent head revision');
          if ((head?.parentTransitionId ?? null) !== write.expectedParent)
            return conflict('different parent transition');
        }
        await repo.appendEvent(write.event);
        for (const change of write.changes) await putChange(repo, change);
        const event = studyEvent(write.event);
        const progressChange = write.changes.find((change) => change.collection === 'taskProgress');
        if (progressChange && write.taskId)
          await repo.putHead({
            profileId,
            id: write.taskId,
            revision: progressChange.row.revision,
            parentTransitionId:
              event.kind === 'attempt_committed' && event.scheduling
                ? event.id
                : write.expectedParent,
          });
        await repo.putOutbox({
          profileId,
          id: event.id,
          canonical: write.event.canonical,
          hash: write.event.hash,
          status: 'pending',
        });
        await repo.putJournal({ ...write, profileId, id: event.id, projectionVersion: 1 });
        const next = addSummary(summary, write.event);
        await repo.putSummary(next);
        await repo.putCheckpoint({ profileId, id: 'summary', projectionVersion: 1, summary: next });
        return { status: 'saved', eventId: event.id };
      });
    },
    async inspect(profileId: string) {
      id(profileId, '$/profileId');
      return uow.read(async (repo) => {
        const events = (await repo.events(profileId)).sort((a, b) =>
          compareOrder(a.order, b.order),
        );
        events.forEach(studyEvent);
        const records = await Promise.all(
          collections.map(
            async (collection) =>
              [
                collection,
                (await repo.rows(collection, profileId)).sort((a, b) =>
                  a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
                ),
              ] as const,
          ),
        );
        const summary = await repo.summary(profileId);
        return {
          events,
          records: Object.fromEntries(records),
          summary,
          staleProjection: summary !== undefined && summary.projectionVersion !== 1,
          outbox: (await repo.outbox(profileId)).sort((a, b) =>
            a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
          ),
          checkpoint: await repo.checkpoint(profileId),
        };
      });
    },
    async eligible(profileId: string, through: number) {
      id(profileId, '$/profileId');
      instant(through, '$/through');
      return uow.read(async (repo) =>
        (await repo.eligibleRows(profileId, through))
          .filter((row) => row.eligibleAt !== undefined && row.eligibleAt <= through)
          .sort(
            (a, b) =>
              (a.eligibleAt ?? 0) - (b.eligibleAt ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
          )
          .map((row) => validateRecord(row.record)),
      );
    },
    async rebuild(profileId: string) {
      id(profileId, '$/profileId');
      return uow.write(async (repo) => {
        const events = (await repo.events(profileId)).sort((a, b) =>
          compareOrder(a.order, b.order),
        );
        const journals = await repo.journals(profileId);
        check('$', journals.length === events.length, 'missing retained projection checkpoint');
        let summary = emptySummary(profileId);
        const projected = new Map<string, Change>();
        const heads = new Map<string, { revision: number; parentTransitionId: string | null }>();
        for (const row of events) {
          const event = studyEvent(row);
          const journal = journals.find((item) => item.id === row.id);
          check(
            '$',
            journal !== undefined &&
              journal.projectionVersion === 1 &&
              journal.event.canonical === row.canonical &&
              journal.event.hash === row.hash,
            'invalid retained checkpoint',
          );
          for (const change of journal.changes) {
            const key = `${change.collection}:${change.row.id}`;
            const old = projected.get(key);
            if (!old || newer(change.row, old.row)) {
              projected.set(key, change);
              if (change.collection === 'taskProgress')
                heads.set(change.row.id, {
                  revision: change.row.revision,
                  parentTransitionId:
                    event.kind === 'attempt_committed' && event.scheduling
                      ? event.id
                      : journal.expectedParent,
                });
            }
          }
          summary = addSummary(summary, row);
        }
        // Retained after-images repair projections, without replaying FSRS or discarding independent drafts.
        for (const change of projected.values()) await repo.putRow(change.collection, change.row);
        for (const [taskId, head] of heads) await repo.putHead({ profileId, id: taskId, ...head });
        await repo.putSummary(summary);
        await repo.putCheckpoint({ profileId, id: 'summary', projectionVersion: 1, summary });
        return summary;
      });
    },
  };
}
