// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import history from '../../fixtures/learning/replay/history.json';
import type { ReplayReport } from '../../../src/infrastructure/fsrs/replay/replay.ts';

it('T18: AC1/AC3 direct Node replay matches pinned JSON and reports unsupported input without changing files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'woorden-replay-'));
  try {
    const bad = structuredClone(history);
    bad.transitions[3]!.intervalPolicy.version = 'unsupported';
    const inputs = [history, bad, { ...history, replayVersion: 99 }];
    const paths = inputs.map((value, i) => {
      const path = join(dir, `${i}.json`);
      writeFileSync(path, JSON.stringify(value));
      return path;
    });
    const run = spawnSync(process.execPath, ['tools/learning/replay-schedule.ts', ...paths], {
      encoding: 'utf8',
    });
    expect(run.status, run.stderr).toBe(1);
    expect(run.stderr).toBe('');
    const reports = run.stdout
      .trim()
      .split('\n')
      .map((line): ReplayReport => JSON.parse(line) as ReplayReport);
    expect(reports[0]).toMatchObject({
      status: 'verified',
      transitions: history.transitions,
      final: history.transitions.at(-1)!.after,
    });
    expect(reports[1]).toMatchObject({ status: 'blocked', original: bad, blockedAt: 3 });
    expect(reports[1]).not.toHaveProperty('final');
    expect(reports[2]).toMatchObject({ status: 'blocked', original: inputs[2], blockedAt: null });
    for (const [i, path] of paths.entries())
      expect(readFileSync(path, 'utf8')).toBe(JSON.stringify(inputs[i]));
    const valid = spawnSync(process.execPath, ['tools/learning/replay-schedule.ts', paths[0]!], {
      encoding: 'utf8',
    });
    expect(valid.status, valid.stderr).toBe(0);
    expect(JSON.parse(valid.stdout)).toEqual(reports[0]);
    writeFileSync(paths[0]!, '{');
    const malformed = spawnSync(
      process.execPath,
      ['tools/learning/replay-schedule.ts', paths[0]!],
      { encoding: 'utf8' },
    );
    expect(malformed.status).toBe(1);
    expect(malformed.stdout).toBe('');
    expect(malformed.stderr).toContain(paths[0]);
    for (const args of [[], ['/missing-history.json']])
      expect(
        spawnSync(process.execPath, ['tools/learning/replay-schedule.ts', ...args]).status,
      ).toBe(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
