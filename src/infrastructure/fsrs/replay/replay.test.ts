import { describe, expect, it } from 'vitest';
import history from '../../../../tests/fixtures/learning/replay/history.json';
import capped from '../../../../tests/fixtures/learning/replay/capped.json';
import pinned from '../fixtures/scheduling.json';
import {
  activateFutureParameters,
  previewFutureTransition,
  replaySchedule,
  rollbackFutureParameters,
  selectFutureParameters,
} from './replay.ts';

const alternate = {
  ...history.parameterSets[0]!,
  id: '10000000-0000-4000-8000-000000000001',
  parameters: {
    ...history.parameterSets[0]!.parameters,
    request_retention: 0.95,
    maximum_interval: 100,
  },
};
function verified(value: unknown) {
  const report = replaySchedule(value);
  expect(report.status, report.status === 'blocked' ? report.reason : '').toBe('verified');
  if (report.status !== 'verified') throw new Error(report.reason);
  return report;
}
describe('retained schedule replay', () => {
  it('T18: AC1 replay retains a native 367-day card/log with a separate 365-day effective cap', () => {
    const report = verified(JSON.parse(JSON.stringify(capped)));
    expect(report.transitions).toEqual(capped.transitions);
    const transition = report.transitions[0]!;
    expect(transition.after.scheduledDays).toBe(367);
    expect(transition.effectiveScheduledDays).toBe(365);
    expect(transition.after.rawDueAt - transition.effectiveRawDueAt).toBe(2 * 86_400_000);
    expect(transition.intervalPolicy.capped).toBe(true);
    const altered = structuredClone(capped);
    altered.transitions[0]!.effectiveRawDueAt++;
    expect(replaySchedule(altered).status).toBe('blocked');
  });
  it('T18: AC1 pinned review/lapse/relearning history replays exact native and effective cards/logs after JSON round-trip', () => {
    const original = JSON.stringify(history);
    const report = verified(JSON.parse(original));
    expect(report.transitions).toEqual(history.transitions);
    expect(report.final).toEqual(history.transitions.at(-1)!.after);
    expect(report.final.nativeCard.lapses).toBe(1);
    expect(report.transitions.map((t) => t.after.phase)).toContain('relearning');
    for (const [i, transition] of report.transitions.entries()) {
      const names = ['New', 'Learning', 'Review', 'Relearning'];
      expect({
        ...transition.after.nativeCard,
        state: names[transition.after.nativeCard.state],
      }).toEqual(pinned.traces[0]!.steps[i]!.result.card);
      const log = transition.nativeLog as { [key: string]: unknown };
      expect({
        ...log,
        state: names[Number(log.state)],
        rating: transition.rating.replace(/^./, (letter) => letter.toUpperCase()),
      }).toEqual(pinned.traces[0]!.steps[i]!.result.log);
      expect(transition.effectiveRawDueAt).toBe(transition.after.rawDueAt);
    }
    expect(JSON.stringify(history)).toBe(original);
    // Canonical comparison tolerates key ordering changes, not changes in values.
    const reordered: unknown = JSON.parse(original, (_key, value: unknown) =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).reverse())
        : value,
    );
    expect(verified(reordered).transitions).toEqual(report.transitions);
  });

  it('T18: AC2 future parameter activation and rollback preserve retained results and record every new identity/policy', () => {
    const original = JSON.stringify(history);
    const oldSet = history.parameterSets[0]!;
    const sets = [oldSet, alternate];
    const baseline = selectFutureParameters(sets, oldSet.id);
    expect(() => {
      baseline.parameterSets[0]!.parameters.request_retention = 0.8;
    }).toThrow();
    const changed = activateFutureParameters(baseline, alternate.id);
    const card = verified(history).final;
    const first = previewFutureTransition(changed, card, card.rawDueAt, 'good');
    expect(first.after.parameterSetId).toBe(alternate.id);
    expect(first.before.nativeCard).toEqual(card.nativeCard);
    expect(first.intervalPolicy.maximumDays).toBe(100);
    expect(first.intervalPolicy.version).toBe('fsrs-interval-cap-v1');
    const rollback = rollbackFutureParameters(changed);
    expect(rollback.activeParameterSetId).toBe(oldSet.id);
    expect(rollback.parameterSets).toEqual(sets);
    const second = previewFutureTransition(rollback, first.after, first.after.rawDueAt, 'good');
    expect(second.after.parameterSetId).toBe(oldSet.id);
    expect(second.intervalPolicy.maximumDays).toBe(365);
    const retained = {
      ...history,
      parameterSets: sets,
      transitions: [...history.transitions, first, second],
    };
    expect(verified(JSON.parse(JSON.stringify(retained))).transitions).toEqual(
      retained.transitions,
    );
    expect(
      verified({
        ...history,
        parameterSets: sets,
        futureSteps: [
          { parameterSetId: alternate.id, evaluationAt: card.rawDueAt, rating: 'good' },
          { parameterSetId: oldSet.id, evaluationAt: first.after.rawDueAt, rating: 'good' },
        ],
      }).futurePreviews,
    ).toEqual([first, second]);
    expect(changed.activeParameterSetId).toBe(alternate.id);
    expect(baseline.activeParameterSetId).toBe(oldSet.id);
    expect(JSON.stringify(history)).toBe(original);
    expect(() => rollbackFutureParameters(baseline)).toThrow('no previous');
    expect(() =>
      activateFutureParameters(baseline, '10000000-0000-4000-8000-000000000099'),
    ).toThrow('unresolved');
    expect(() =>
      selectFutureParameters([oldSet, { ...alternate, id: oldSet.id }], oldSet.id),
    ).toThrow('immutable');
  });

  const mutations: [string, (h: typeof history) => void][] = [
    [
      'engine',
      (h) => {
        h.initial.scheduler.engine = 'other-engine';
      },
    ],
    [
      'package',
      (h) => {
        h.parameterSets[0]!.packageVersion = '99';
      },
    ],
    [
      'schema',
      (h) => {
        h.initial.scheduler.serializationVersion = 99;
      },
    ],
    [
      'parameter schema',
      (h) => {
        h.parameterSets[0]!.parameterVersion = 99;
      },
    ],
    [
      'policy',
      (h) => {
        h.transitions[2]!.intervalPolicy.version = 'future-policy';
      },
    ],
    [
      'adapter',
      (h) => {
        h.transitions[2]!.adapterVersion = 'future-adapter';
      },
    ],
    [
      'base',
      (h) => {
        h.transitions[2]!.before.nativeCard.stability += 1;
      },
    ],
    [
      'after',
      (h) => {
        h.transitions[2]!.after.nativeCard.stability += 1;
      },
    ],
    [
      'log',
      (h) => {
        h.transitions[2]!.nativeLog.stability += 1;
      },
    ],
    [
      'effective interval',
      (h) => {
        h.transitions[2]!.effectiveScheduledDays += 1;
      },
    ],
    [
      'captured instant',
      (h) => {
        h.transitions[2]!.evaluationAt += 1;
      },
    ],
    [
      'missing parameters',
      (h) => {
        h.parameterSets = [];
      },
    ],
    [
      'changed identified parameters',
      (h) => {
        h.parameterSets[0]!.parameters.request_retention = 0.95;
      },
    ],
  ];
  for (const [name, mutate] of mutations)
    it(`T18: AC3 ${name} incompatibility preserves input and emits no valid replacement`, () => {
      const input = structuredClone(history);
      mutate(input);
      const bytes = JSON.stringify(input);
      const report = replaySchedule(input);
      expect(report).toMatchObject({ status: 'blocked', original: input });
      expect(report).not.toHaveProperty('transitions');
      expect(report).not.toHaveProperty('final');
      expect(report).not.toHaveProperty('futurePreviews');
      expect(JSON.stringify(input)).toBe(bytes);
    });
});
