import { describe, expect, it, vi } from 'vitest';
import { TypeConvert } from 'ts-fsrs';
import fixtures from '../fixtures/scheduling.json';
import parameters from '../../../../tests/fixtures/runtime/parameters.json';
import sequence from '../../../../tests/fixtures/learning/fsrs/sequence.json';
import { createFsrsAdapter, ratings } from './adapter.ts';
import type { SchedulerSnapshot, Transition } from './adapter.ts';

const states = ['New', 'Learning', 'Review', 'Relearning'];
const phases = ['new', 'learning', 'review', 'relearning'];
function snapshot(card: (typeof fixtures.cases)[number]['card']) {
  const state = states.indexOf(card.state);
  return createFsrsAdapter(parameters).deserialize(
    JSON.stringify({
      formatVersion: 1,
      kind: 'scheduler_envelope',
      scheduler: {
        engine: 'ts-fsrs',
        packageVersion: '5.4.2',
        parameterSetId: parameters.id,
        serializationVersion: 1,
        nativeCard: { ...card, state },
        rawDueAt: Date.parse(card.due),
        phase: phases[state],
        scheduledDays: card.scheduled_days,
      },
    }),
  );
}
function readable(result: Transition) {
  const log = result.nativeLog as { [key: string]: unknown };
  return {
    card: { ...result.after.nativeCard, state: states[result.after.nativeCard.state] },
    log: {
      ...log,
      state: states[Number(log.state)],
      rating: ratings[Number(log.rating) - 1]?.replace(/^./, (letter) => letter.toUpperCase()),
    },
  };
}

describe('production FSRS adapter', () => {
  for (const scenario of fixtures.cases) {
    it(`T02: AC1 ${scenario.name} all ratings match pinned fixtures with detached preview/rating`, () => {
      const adapter = createFsrsAdapter(parameters);
      const card = snapshot(scenario.card);
      const before = JSON.stringify(card);
      const at = Date.parse(scenario.at);
      const preview = adapter.preview(card, at);
      for (const rating of ratings) {
        const name = rating.replace(/^./, (letter) =>
          letter.toUpperCase(),
        ) as keyof typeof scenario.ratings;
        const result = adapter.applyRating(card, at, rating);
        expect(result).toEqual(preview[rating]);
        expect(readable(result)).toEqual(scenario.ratings[name]);
        expect(result.before).not.toBe(card);
        expect(result.after.nativeCard).not.toBe(card.nativeCard);
        expect(result.evaluationAt).toBe(at);
      }
      expect(JSON.stringify(card)).toBe(before);
      const metadata = adapter.metadata();
      expect(metadata.engine).toBe(fixtures.engine);
      expect(metadata.parameterSet.parameters).toEqual(fixtures.parameters);
      metadata.parameterSet.parameters.w[0] = 999;
      expect(adapter.metadata().parameterSet.parameters).toEqual(fixtures.parameters);
      expect(adapter.preview(card, at)).toEqual(preview);
    });
  }

  it('T60: AC2 native 365/366/367 remain exact while the application interval caps each at 365', () => {
    const scenario = fixtures.cases.find((item) => item.name === 'review-at-maximum');
    if (!scenario) throw new Error('Missing edge fixture');
    const adapter = createFsrsAdapter(parameters);
    const card = snapshot(scenario.card);
    const at = Date.parse(scenario.at);
    const preview = adapter.preview(card, at);
    for (const [rating, days] of [
      ['hard', 365],
      ['good', 366],
      ['easy', 367],
    ] as const) {
      const result = adapter.applyRating(card, at, rating);
      expect(result.after.scheduledDays).toBe(days);
      expect(result.after.nativeCard.scheduled_days).toBe(days);
      expect(result.after.rawDueAt).toBe(at + days * 86_400_000);
      expect(result.effectiveScheduledDays).toBe(365);
      expect(result.effectiveRawDueAt).toBe(at + 365 * 86_400_000);
      expect(result.intervalPolicy).toEqual({
        version: 'fsrs-interval-cap-v1',
        maximumDays: 365,
        capped: days > 365,
      });
      expect(result.adapterVersion).toContain(result.intervalPolicy.version);
      expect(result).toEqual(preview[rating]);
      expect(adapter.deserialize(adapter.serialize(result.after))).toEqual(result.after);
    }
  });

  it('T02: AC1 createTask and a complete learning/relearning sequence preserve native cards/logs', () => {
    const adapter = createFsrsAdapter(parameters);
    let card = adapter.createTask(sequence.createdAt);
    expect(card).toEqual(snapshot(fixtures.cases[0]!.card));
    for (const [i, step] of sequence.steps.entries()) {
      const rating = step.rating as (typeof ratings)[number];
      const result = adapter.applyRating(card, step.at, rating);
      expect(readable(result)).toEqual(fixtures.traces[0]!.steps[i]!.result);
      card = result.after;
    }
    expect(card.phase).toBe('review');
    expect(card.nativeCard.lapses).toBe(1);
  });

  it('W10: AC3 serialized cards preserve exact dates/numbers and continue identically', () => {
    const adapter = createFsrsAdapter(parameters);
    for (const scenario of fixtures.cases) {
      const card = snapshot(scenario.card);
      const restored = adapter.deserialize(adapter.serialize(card));
      expect(restored).toEqual(card);
      expect(restored).not.toBe(card);
      expect(restored.nativeCard.due).toBe(scenario.card.due);
      expect(adapter.preview(restored, Date.parse(scenario.at))).toEqual(
        adapter.preview(card, Date.parse(scenario.at)),
      );
    }
  });

  it('W10: AC3 reused validator rejects malformed envelopes before date restoration or scheduling', () => {
    const adapter = createFsrsAdapter(parameters);
    const card = snapshot(fixtures.cases[1]!.card);
    const mutations: ((card: SchedulerSnapshot) => void)[] = [
      (s) => {
        s.nativeCard.stability = Number.NaN;
      },
      (s) => {
        s.nativeCard.difficulty = 11;
      },
      (s) => {
        s.nativeCard.reps = -1;
      },
      (s) => {
        s.nativeCard.lapses = s.nativeCard.reps + 1;
      },
      (s) => {
        s.nativeCard.learning_steps = 1.5;
      },
      (s) => {
        s.nativeCard.due = 'not-a-date';
      },
      (s) => {
        s.rawDueAt++;
      },
      (s) => {
        s.scheduledDays++;
      },
      (s) => {
        s.phase = 'new';
      },
      (s) => {
        s.nativeCard.last_review = undefined;
      },
      (s) => {
        s.parameterSetId = '10000000-0000-4000-8000-000000000001';
      },
    ];
    const conversion = vi.spyOn(TypeConvert, 'card');
    try {
      for (const mutate of mutations) {
        const changed = structuredClone(card);
        mutate(changed);
        expect(() => adapter.preview(changed, Date.parse(card.nativeCard.due))).toThrow();
        expect(() =>
          adapter.applyRating(changed, Date.parse(card.nativeCard.due), 'good'),
        ).toThrow();
        expect(() =>
          adapter.deserialize(
            JSON.stringify({ formatVersion: 1, kind: 'scheduler_envelope', scheduler: changed }),
          ),
        ).toThrow();
      }
      expect(conversion).not.toHaveBeenCalled();
    } finally {
      conversion.mockRestore();
    }
    for (const input of ['{', JSON.stringify({ kind: 'unsupported' })])
      expect(() => adapter.deserialize(input)).toThrow();
  });

  it('T02: AC4 changing time or state recomputes, and preview objects cannot enter applyRating', () => {
    const adapter = createFsrsAdapter(parameters);
    const card = adapter.createTask(sequence.createdAt);
    const old = adapter.preview(card, sequence.createdAt).good;
    const later = adapter.applyRating(card, sequence.createdAt + 900_000, 'good');
    expect(later.after.rawDueAt).toBe(old.after.rawDueAt + 900_000);
    expect(later.evaluationAt).not.toBe(old.evaluationAt);
    const changed = adapter.applyRating(old.after, old.after.rawDueAt, 'good');
    expect(changed.before.nativeCard.reps).toBe(1);
    expect(changed.after.nativeCard.reps).toBe(2);
    expect(changed).not.toEqual(old);
    expect(() => adapter.applyRating(old, old.evaluationAt, 'good')).toThrow('unknown field');
    expect(() => adapter.preview(old.after, sequence.createdAt - 1)).toThrow('cannot precede');
  });

  it('W10: malformed parameters, fuzz, unsupported versions/ratings and invalid instants fail closed', () => {
    expect(() =>
      createFsrsAdapter({
        ...parameters,
        parameters: { ...parameters.parameters, enable_fuzz: true },
      }),
    ).toThrow('fuzz off');
    expect(() => createFsrsAdapter({ ...parameters, packageVersion: '9.9' })).toThrow(
      'packageVersion',
    );
    expect(() =>
      createFsrsAdapter({ ...parameters, parameters: { ...parameters.parameters, w: [] } }),
    ).toThrow('/w');
    const adapter = createFsrsAdapter(parameters);
    expect(() => adapter.createTask(Number.NaN)).toThrow('createdAt');
    expect(() => adapter.preview(adapter.createTask(0), Number.POSITIVE_INFINITY)).toThrow(
      'evaluationAt',
    );
    expect(() => adapter.applyRating(adapter.createTask(0), 0, 'manual' as 'good')).toThrow(
      'rating',
    );
  });
});
