// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sequence from '../../tests/fixtures/learning/fsrs/sequence.json';
import fixtures from '../../src/infrastructure/fsrs/fixtures/scheduling.json';
import type {
  AppRating,
  SchedulerSnapshot,
  Transition,
} from '../../src/infrastructure/fsrs/adapter/adapter.ts';

interface Inspection {
  engine: string;
  parameterSet: typeof sequence.parameterSet;
  initial: SchedulerSnapshot;
  steps: {
    at: number;
    rating: AppRating;
    previews: Record<AppRating, Transition>;
    result: Transition;
  }[];
}
function run(values: unknown[]) {
  const dir = mkdtempSync(join(tmpdir(), 'fsrs-inspector-'));
  try {
    const paths = values.map((value, i) => {
      const path = join(dir, `${i}.json`);
      writeFileSync(path, JSON.stringify(value));
      return path;
    });
    const result = spawnSync(process.execPath, ['tools/learning/inspect-fsrs.ts', ...paths], {
      encoding: 'utf8',
    });
    for (const [i, path] of paths.entries())
      expect(readFileSync(path, 'utf8')).toBe(JSON.stringify(values[i]));
    return result;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const report = (value: unknown): Inspection => {
  const result = run([value]);
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toBe('');
  return JSON.parse(result.stdout) as Inspection;
};

describe('direct Node FSRS inspector', () => {
  it('T02: AC1 fixed learning/relearning sequence prints every native card/log and resolved parameters', () => {
    const first = report(sequence);
    expect(report(sequence)).toEqual(first);
    expect(first.engine).toBe(fixtures.engine);
    expect(first.parameterSet.parameters).toEqual(fixtures.parameters);
    expect(first.steps).toHaveLength(sequence.steps.length);
    for (const [i, step] of first.steps.entries()) {
      const expected = fixtures.traces[0]!.steps[i]!.result;
      const names = ['New', 'Learning', 'Review', 'Relearning'];
      expect({
        ...step.result.after.nativeCard,
        state: names[step.result.after.nativeCard.state],
      }).toEqual(expected.card);
      const log = step.result.nativeLog as { [key: string]: unknown };
      expect({
        ...log,
        state: names[Number(log.state)],
        rating: step.rating.replace(/^./, (letter) => letter.toUpperCase()),
      }).toEqual(expected.log);
      expect(step.previews[step.rating]).toEqual(step.result);
    }
  });

  it('T60: AC2 Node inspection preserves maximum native proposals alongside capped results', () => {
    const edge = fixtures.cases.find((item) => item.name === 'review-at-maximum');
    if (!edge) throw new Error('Missing edge fixture');
    const first = report({
      ...sequence,
      initial: {
        formatVersion: 1,
        kind: 'scheduler_envelope',
        scheduler: {
          engine: 'ts-fsrs',
          packageVersion: '5.4.2',
          parameterSetId: sequence.parameterSet.id,
          serializationVersion: 1,
          nativeCard: { ...edge.card, state: 2 },
          phase: 'review',
          rawDueAt: Date.parse(edge.card.due),
          scheduledDays: edge.card.scheduled_days,
        },
      },
      steps: [{ at: Date.parse(edge.at), rating: 'easy' }],
    });
    const preview = first.steps[0]!.previews;
    expect([
      preview.hard.after.scheduledDays,
      preview.good.after.scheduledDays,
      preview.easy.after.scheduledDays,
    ]).toEqual([365, 366, 367]);
    expect([
      preview.hard.effectiveScheduledDays,
      preview.good.effectiveScheduledDays,
      preview.easy.effectiveScheduledDays,
    ]).toEqual([365, 365, 365]);
    expect(first.steps[0]!.result).toEqual(preview.easy);
  });

  it('T02: AC4 different captured time/state produce fresh proposals rather than stale previews', () => {
    const at = sequence.createdAt;
    const initial = report({ ...sequence, steps: [{ at, rating: 'good' }] });
    const later = report({ ...sequence, steps: [{ at: at + 900_000, rating: 'good' }] });
    expect(later.steps[0]!.result.after.rawDueAt).toBe(
      initial.steps[0]!.result.after.rawDueAt + 900_000,
    );
    const state = initial.steps[0]!.result.after;
    const changed = report({
      ...sequence,
      initial: { formatVersion: 1, kind: 'scheduler_envelope', scheduler: state },
      steps: [{ at: state.rawDueAt, rating: 'good' }],
    });
    expect(changed.steps[0]!.result.after.nativeCard.reps).toBe(2);
    expect(changed.steps[0]!.result.after.phase).toBe('review');
    expect(run([{ ...sequence, stalePreview: initial.steps[0]!.result }]).stderr).toContain(
      'unknown field',
    );
  });

  it('W10: invalid input exits unsuccessfully while later valid sequences remain inspectable', () => {
    const result = run([
      { ...sequence, parameterSet: { ...sequence.parameterSet, packageVersion: '99' } },
      sequence,
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('packageVersion');
    expect(result.stdout.trim().split('\n')).toHaveLength(1);
    for (const args of [[], ['/missing-sequence.json']]) {
      const failed = spawnSync(process.execPath, ['tools/learning/inspect-fsrs.ts', ...args], {
        encoding: 'utf8',
      });
      expect(failed.status).toBe(1);
      expect(failed.stderr.length).toBeGreaterThan(0);
    }
  });
});
