import { describe, expect, it } from 'vitest';
import { createEmptyCard, fsrs, FSRSVersion, Grades, Rating, State, TypeConvert } from 'ts-fsrs';
import type { CardInput, RecordLogItem } from 'ts-fsrs';
import report from '../../../docs/architecture/spikes/fsrs.md?raw';
import manifest from '../../../package.json';
import fixtures from './fixtures/scheduling.json';
import { createdAt, spikeConfig, traceInputs } from './spike-inputs';

function restoreCard(card: Omit<CardInput, 'state'> & { state: string }) {
  return TypeConvert.card({ ...card, state: TypeConvert.state(card.state) });
}

function readable(result: RecordLogItem) {
  // Use the native JSON date representation and names to compare with the recorded fixture.
  const value = {
    card: { ...result.card, state: State[result.card.state] },
    log: { ...result.log, state: State[result.log.state], rating: Rating[result.log.rating] },
  };
  const json: unknown = JSON.parse(JSON.stringify(value));
  return json;
}

describe('pinned ts-fsrs spike', () => {
  it('records the exact dependency, engine and resolved starting parameters', () => {
    expect(manifest.dependencies['ts-fsrs']).toBe('5.4.2');
    expect(FSRSVersion).toBe(fixtures.engine);
    expect(fsrs(spikeConfig).parameters).toEqual(fixtures.parameters);
  });

  for (const scenario of fixtures.cases) {
    describe(scenario.name, () => {
      for (const grade of Grades) {
        const rating = Rating[grade] as keyof typeof scenario.ratings;

        it(`matches the committed ${rating} card and review log fixture`, () => {
          const card =
            scenario.name === 'new'
              ? createEmptyCard(new Date(createdAt))
              : restoreCard(scenario.card);
          const result = fsrs(spikeConfig).next(card, new Date(scenario.at), grade);
          expect(readable(result)).toEqual(scenario.ratings[rating]);
        });

        it(`schedules identical ${rating} inputs twice with fuzz disabled`, () => {
          const scheduler = fsrs(spikeConfig);
          const card = restoreCard(scenario.card);
          const before = JSON.stringify(card);
          const at = new Date(scenario.at);
          const first = scheduler.next(card, at, grade);
          const second = scheduler.next(card, at, grade);
          expect(second).toEqual(first);
          expect(fsrs(spikeConfig).next(card, at, grade)).toEqual(first);
          expect(JSON.stringify(card)).toBe(before);
          expect(at.toISOString()).toBe(scenario.at);
        });

        it(`T02: ${rating} preview and rating agree for identical state and time`, () => {
          const scheduler = fsrs(spikeConfig);
          const card = restoreCard(scenario.card);
          const before = JSON.stringify(card);
          const at = new Date(scenario.at);
          const preview = scheduler.repeat(card, at);
          expect(JSON.stringify(card)).toBe(before);
          expect(preview[grade]).toEqual(scheduler.next(card, at, grade));
          expect(JSON.stringify(card)).toBe(before);
        });
      }
    });
  }

  for (const [traceIndex, input] of traceInputs.entries()) {
    it(`records every transition in ${input.name} at fixed due instants`, () => {
      const scheduler = fsrs(spikeConfig);
      let card = createEmptyCard(new Date(createdAt));
      const recorded = fixtures.traces[traceIndex];
      expect(recorded?.name).toBe(input.name);
      expect(recorded?.steps).toHaveLength(input.steps.length);
      for (const [stepIndex, { at, rating }] of input.steps.entries()) {
        expect(card.due.toISOString()).toBe(at);
        const result = scheduler.next(card, new Date(at), rating);
        const expected = recorded?.steps[stepIndex];
        expect(expected?.at).toBe(at);
        expect(expected?.rating).toBe(Rating[rating]);
        expect(readable(result)).toEqual(expected?.result);
        card = result.card;
      }
    });
  }

  it('preserves the maximum-interval ordering edge: Hard/Good/Easy are 365/366/367 days', () => {
    const scenario = fixtures.cases.find(({ name }) => name === 'review-at-maximum');
    if (!scenario) throw new Error('Missing maximum-interval fixture');
    const scheduler = fsrs(spikeConfig);
    const card = restoreCard(scenario.card);
    for (const [grade, days] of [
      [Rating.Hard, 365],
      [Rating.Good, 366],
      [Rating.Easy, 367],
    ] as const) {
      const result = scheduler.next(card, new Date(scenario.at), grade);
      expect(result.card.scheduled_days).toBe(days);
      expect(result.card.due.getTime() - new Date(scenario.at).getTime()).toBe(days * 86_400_000);
    }
  });

  it('T18: JSON round trip after several reviews preserves every next rating', () => {
    const input = traceInputs[0];
    if (!input) throw new Error('Missing review trace');
    const scheduler = fsrs(spikeConfig);
    let card = createEmptyCard(new Date(createdAt));
    for (const { at, rating } of input.steps.slice(0, 5)) {
      card = scheduler.next(card, new Date(at), rating).card;
    }
    const parsed: unknown = JSON.parse(JSON.stringify(card));
    expect(parsed).toHaveProperty('due', '2026-07-11T12:10:00.000Z');
    expect(parsed).toHaveProperty('last_review', '2026-02-15T12:10:00.000Z');
    // Only a just-generated native card is cast here; W10 must validate untrusted snapshots.
    const restored = TypeConvert.card(parsed as CardInput);
    expect(restored.due).toBeInstanceOf(Date);
    expect(restored.last_review).toBeInstanceOf(Date);
    expect(restored).toEqual(card);
    for (const grade of Grades) {
      const at = new Date('2026-07-11T12:10:00.000Z');
      expect(scheduler.next(restored, at, grade)).toEqual(scheduler.next(card, at, grade));
    }
  });

  it('records the pinned engine, findings and W10 open questions in the spike report', () => {
    expect(report).toContain(fixtures.engine);
    for (const topic of [
      'Reproducing the fixtures',
      'API and preview versus commit',
      'State fields',
      'Step and interval semantics',
      'Serialization',
      'Open questions for W10',
    ]) {
      expect(report).toContain(`## ${topic}`);
    }
  });
});
