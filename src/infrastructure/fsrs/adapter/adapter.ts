import { createEmptyCard, fsrs, FSRSVersion, Rating, TypeConvert } from 'ts-fsrs';
import type { Card, FSRSParameters, RecordLogItem } from 'ts-fsrs';
import { validateRecord } from '../../../contracts/runtime/records.ts';
import type { RuntimeRecord } from '../../../contracts/runtime/records.ts';
import { check, enumeration, instant } from '../../../contracts/runtime/schema.ts';

export type SchedulerSnapshot = Extract<RuntimeRecord, { kind: 'scheduler_envelope' }>['scheduler'];
export type ParameterSet = Extract<RuntimeRecord, { kind: 'parameter_set' }>;
export type AppRating = 'again' | 'hard' | 'good' | 'easy';
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export const ratings = ['again', 'hard', 'good', 'easy'] as const;
export const intervalPolicyVersion = 'fsrs-interval-cap-v1';
export const adapterVersion = `ts-fsrs-5.4.2/${intervalPolicyVersion}`;
const nativeRatings = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
} as const;
const phases = ['new', 'learning', 'review', 'relearning'] as const;
const dayMs = 86_400_000;

// JSON data from the trusted vendor output; all external cards use the existing runtime validator.
const json = (value: unknown): Json => JSON.parse(JSON.stringify(value)) as Json;

export interface Transition {
  evaluationAt: number;
  rating: AppRating;
  before: SchedulerSnapshot;
  after: SchedulerSnapshot;
  nativeLog: Json;
  effectiveScheduledDays: number;
  effectiveRawDueAt: number;
  intervalPolicy: { version: string; maximumDays: number; capped: boolean };
  adapterVersion: string;
}

/** One vendor instance owns memory proposals; capped intervals are separate application policy. */
export function createFsrsAdapter(inputParameters: unknown) {
  const supplied = validateRecord(inputParameters);
  check('$/kind', supplied.kind === 'parameter_set', 'expected parameter set');
  check(
    '$/parameters/enable_fuzz',
    !supplied.parameters.enable_fuzz,
    'deterministic adapter requires fuzz off',
  );
  const vendor = fsrs({
    ...supplied.parameters,
    w: [...supplied.parameters.w],
    learning_steps: [...supplied.parameters.learning_steps] as FSRSParameters['learning_steps'],
    relearning_steps: [
      ...supplied.parameters.relearning_steps,
    ] as FSRSParameters['relearning_steps'],
  });
  const resolved = validateRecord({ ...supplied, parameters: json(vendor.parameters) });
  check('$/kind', resolved.kind === 'parameter_set', 'expected resolved parameter set');
  const parameterSet: ParameterSet = resolved;
  // The library must not silently clamp/change values under an already identified parameter set.
  check(
    '$/parameters',
    JSON.stringify(parameterSet.parameters) === JSON.stringify(supplied.parameters),
    'resolved parameters differ from the identified set',
  );
  const maximumDays = Math.min(365, parameterSet.parameters.maximum_interval);

  function validateSnapshot(value: unknown): SchedulerSnapshot {
    const record = validateRecord({
      formatVersion: 1,
      kind: 'scheduler_envelope',
      scheduler: value,
    });
    check('$/kind', record.kind === 'scheduler_envelope', 'expected scheduler envelope');
    check(
      '$/scheduler/parameterSetId',
      record.scheduler.parameterSetId === parameterSet.id,
      'parameter set mismatch',
    );
    return record.scheduler;
  }
  function fromCard(card: Card): SchedulerSnapshot {
    return validateSnapshot({
      engine: 'ts-fsrs',
      packageVersion: '5.4.2',
      parameterSetId: parameterSet.id,
      serializationVersion: 1,
      nativeCard: json(card),
      rawDueAt: card.due.getTime(),
      phase: phases[card.state],
      scheduledDays: card.scheduled_days,
    });
  }
  function inputs(snapshot: unknown, at: number) {
    const before = validateSnapshot(snapshot);
    const evaluationAt = instant(at, '$/evaluationAt');
    check(
      '$/evaluationAt',
      before.nativeCard.last_review === undefined ||
        evaluationAt >= Date.parse(before.nativeCard.last_review),
      'cannot precede previous review',
    );
    // Date restoration happens only after the reused native-card boundary has accepted all fields.
    const { last_review, ...fields } = before.nativeCard;
    const native = last_review === undefined ? fields : { ...fields, last_review };
    return { before, evaluationAt, card: TypeConvert.card(native) };
  }
  function transition(
    before: SchedulerSnapshot,
    evaluationAt: number,
    rating: AppRating,
    native: RecordLogItem,
  ): Transition {
    const after = fromCard(native.card);
    const effectiveScheduledDays = Math.min(after.scheduledDays, maximumDays);
    const excessDays = after.scheduledDays - effectiveScheduledDays;
    return {
      evaluationAt,
      rating,
      before,
      after,
      nativeLog: json(native.log),
      effectiveScheduledDays,
      // Elapsed-day cap only. Zoned eligibility is a separate injected time-policy operation.
      effectiveRawDueAt: instant(after.rawDueAt - excessDays * dayMs, '$/effectiveRawDueAt'),
      intervalPolicy: { version: intervalPolicyVersion, maximumDays, capped: excessDays > 0 },
      adapterVersion,
    };
  }
  return {
    metadata() {
      return {
        engine: FSRSVersion,
        packageVersion: '5.4.2',
        parameterSet: structuredClone(parameterSet),
        adapterVersion,
        intervalPolicy: { version: intervalPolicyVersion, maximumDays },
      };
    },
    createTask(at: number): SchedulerSnapshot {
      return fromCard(createEmptyCard(new Date(instant(at, '$/createdAt'))));
    },
    preview(snapshot: unknown, at: number): Record<AppRating, Transition> {
      const { before, evaluationAt, card } = inputs(snapshot, at);
      const proposals = vendor.repeat(card, new Date(evaluationAt));
      return Object.fromEntries(
        ratings.map((rating) => [
          rating,
          transition(before, evaluationAt, rating, proposals[nativeRatings[rating]]),
        ]),
      ) as Record<AppRating, Transition>;
    },
    applyRating(snapshot: unknown, at: number, rating: AppRating): Transition {
      const chosen = enumeration(...ratings)(rating, '$/rating');
      const { before, evaluationAt, card } = inputs(snapshot, at);
      return transition(
        before,
        evaluationAt,
        chosen,
        vendor.next(card, new Date(evaluationAt), nativeRatings[chosen]),
      );
    },
    serialize(snapshot: unknown): string {
      return JSON.stringify({
        formatVersion: 1,
        kind: 'scheduler_envelope',
        scheduler: validateSnapshot(snapshot),
      });
    },
    deserialize(serialized: string): SchedulerSnapshot {
      const value: unknown = JSON.parse(serialized);
      const record = validateRecord(value);
      check('$/kind', record.kind === 'scheduler_envelope', 'expected scheduler envelope');
      return validateSnapshot(record.scheduler);
    },
  };
}
