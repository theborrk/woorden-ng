import { canonicalRecord } from '../../../contracts/runtime/canonical.ts';
import { validateRecord } from '../../../contracts/runtime/records.ts';
import {
  array,
  check,
  enumeration,
  id,
  instant,
  object,
  optional,
} from '../../../contracts/runtime/schema.ts';
import {
  adapterVersion,
  createFsrsAdapter,
  intervalPolicyVersion,
  ratings,
} from '../adapter/adapter.ts';
import type { ParameterSet, SchedulerSnapshot, Transition } from '../adapter/adapter.ts';

const opaque = (value: unknown) => value;
const historySchema = object({
  replayVersion: enumeration(1),
  parameterSets: array(opaque),
  initial: opaque,
  transitions: array(opaque),
  futureSteps: optional(
    array(object({ parameterSetId: id, evaluationAt: instant, rating: enumeration(...ratings) })),
  ),
});
const transitionSchema = object({
  evaluationAt: instant,
  rating: enumeration(...ratings),
  before: opaque,
  after: opaque,
  nativeLog: opaque,
  effectiveScheduledDays: opaque,
  effectiveRawDueAt: opaque,
  intervalPolicy: object({
    version: enumeration(intervalPolicyVersion),
    maximumDays: opaque,
    capped: opaque,
  }),
  adapterVersion: enumeration(adapterVersion),
});

// Compare complete JSON, including logs and cap outputs, independent of object key order.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(',')}}`;
  const encoded = JSON.stringify(value);
  check(
    '$',
    encoded !== undefined && (typeof value !== 'number' || Number.isFinite(value)),
    'expected JSON',
  );
  return encoded;
}
function snapshot(value: unknown): SchedulerSnapshot {
  const record = validateRecord({ formatVersion: 1, kind: 'scheduler_envelope', scheduler: value });
  check('$', record.kind === 'scheduler_envelope', 'expected scheduler envelope');
  return record.scheduler;
}
function registry(values: readonly unknown[]) {
  const sets = new Map<string, ParameterSet>();
  for (const value of values) {
    const resolved = validateRecord(createFsrsAdapter(value).metadata().parameterSet);
    check('$/parameterSets', resolved.kind === 'parameter_set', 'expected parameter set');
    check(
      '$/parameterSets',
      !sets.has(resolved.id),
      'parameter identity must be unique and immutable',
    );
    sets.set(resolved.id, resolved);
  }
  return sets;
}
const resolve = (sets: Map<string, ParameterSet>, key: string) => {
  const set = sets.get(key);
  check('$/parameterSetId', set !== undefined, 'unresolved parameter identity');
  return createFsrsAdapter(set);
};

export interface ParameterSelection {
  readonly parameterSets: readonly ParameterSet[];
  readonly activeParameterSetId: string;
  readonly previousParameterSetId: string | null;
}
/** Selection is a detached preview; it does not update cards, history or repositories. */
export function selectFutureParameters(
  values: readonly unknown[],
  activeId: string,
  previousId: string | null = null,
): ParameterSelection {
  const sets = registry(values);
  resolve(sets, activeId);
  if (previousId !== null) resolve(sets, previousId);
  return Object.freeze({
    parameterSets: Object.freeze([...sets.values()]),
    activeParameterSetId: activeId,
    previousParameterSetId: previousId,
  });
}
export function activateFutureParameters(
  selection: ParameterSelection,
  activeId: string,
): ParameterSelection {
  return selectFutureParameters(selection.parameterSets, activeId, selection.activeParameterSetId);
}
export function rollbackFutureParameters(selection: ParameterSelection): ParameterSelection {
  check(
    '$',
    selection.previousParameterSetId !== null,
    'no previous parameter set to roll back to',
  );
  return activateFutureParameters(selection, selection.previousParameterSetId);
}
export function previewFutureTransition(
  selection: ParameterSelection,
  value: unknown,
  at: number,
  rating: Transition['rating'],
): Transition {
  const before = snapshot(value);
  const sets = registry(selection.parameterSets);
  resolve(sets, before.parameterSetId);
  const adapter = resolve(sets, selection.activeParameterSetId);
  // Only the next transition selects new parameters. Native memory/due/history remain intact.
  return adapter.applyRating(
    { ...before, parameterSetId: selection.activeParameterSetId },
    at,
    rating,
  );
}

export type ReplayReport =
  | {
      status: 'verified';
      original: unknown;
      transitions: Transition[];
      final: SchedulerSnapshot;
      futurePreviews: Transition[];
    }
  | { status: 'blocked'; original: unknown; blockedAt: number | null; reason: string };

/** Dispatch only the pinned interpreter; a failed history never exposes a replacement schedule. */
export function replaySchedule(input: unknown): ReplayReport {
  const original: unknown = structuredClone(input);
  let blockedAt: number | null = null;
  try {
    const history = historySchema(input, '$');
    const sets = registry(history.parameterSets);
    const initial = validateRecord(history.initial);
    check('$/initial', initial.kind === 'scheduler_envelope', 'expected scheduler envelope');
    let card = initial.scheduler;
    resolve(sets, card.parameterSetId);
    const transitions: Transition[] = [];
    for (const [index, value] of history.transitions.entries()) {
      blockedAt = index;
      const recorded = transitionSchema(value, `$/transitions/${index}`);
      const before = snapshot(recorded.before);
      const after = snapshot(recorded.after);
      const adapter = resolve(sets, before.parameterSetId);
      // An explicit recorded parameter change may rebind identity, never the memory state.
      check(
        '$/before',
        canonicalRecord({
          formatVersion: 1,
          kind: 'scheduler_envelope',
          scheduler: { ...card, parameterSetId: before.parameterSetId },
        }).canonical ===
          canonicalRecord({ formatVersion: 1, kind: 'scheduler_envelope', scheduler: before })
            .canonical,
        'mismatched canonical base',
      );
      check(
        '$/after',
        before.parameterSetId === after.parameterSetId,
        'transition parameter identity mismatch',
      );
      const computed = adapter.applyRating(before, recorded.evaluationAt, recorded.rating);
      check(
        '$/transition',
        canonical(computed) === canonical(recorded),
        'recorded transition differs from pinned interpreter',
      );
      transitions.push(computed);
      card = computed.after;
    }
    blockedAt = null;
    let selection = selectFutureParameters([...sets.values()], card.parameterSetId);
    let futureCard = card;
    const futurePreviews = (history.futureSteps ?? []).map((step) => {
      selection = activateFutureParameters(selection, step.parameterSetId);
      const transition = previewFutureTransition(
        selection,
        futureCard,
        step.evaluationAt,
        step.rating,
      );
      futureCard = transition.after;
      return transition;
    });
    return { status: 'verified', original, transitions, final: card, futurePreviews };
  } catch (error) {
    return {
      status: 'blocked',
      original,
      blockedAt,
      reason: error instanceof Error ? error.message : 'Replay compatibility failure',
    };
  }
}
