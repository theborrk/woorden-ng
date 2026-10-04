// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { baseline, matrix, trialFor } from '../../fixtures/learning/scoring/matrix.ts';
import type { Classification } from '../../../src/domain/attempt-scoring/classify.ts';

describe('direct Node scoring inspector', () => {
  it('T03: AC1 and T09/T14: AC4 fixture matrix preserves initial failure and non-scheduled/technical outcomes', () => {
    const directory = mkdtempSync(join(tmpdir(), 'woorden-scoring-'));
    try {
      const files = matrix.map((entry, i) => {
        const file = join(directory, `${i}.json`);
        writeFileSync(file, JSON.stringify(trialFor(entry)));
        return file;
      });
      const originals = files.map((file) => readFileSync(file, 'utf8'));
      const run = spawnSync(process.execPath, ['tools/learning/inspect-scoring.ts', ...files], {
        encoding: 'utf8',
      });
      expect(run.status).toBe(0);
      expect(run.stderr).toBe('');
      const rows = run.stdout
        .trim()
        .split('\n')
        .map((row): Classification => JSON.parse(row) as Classification);
      expect(rows).toHaveLength(matrix.length);
      for (const [i, entry] of matrix.entries())
        expect(rows[i]).toMatchObject({
          proposedRatings: entry.ratings,
          independent: entry.independent,
          initial: entry.initial,
          verifiedSpeech: false,
        });
      expect(files.map((file) => readFileSync(file, 'utf8'))).toEqual(originals);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it('I09: invalid files exit unsuccessfully, emit no rating, and allow later valid files', () => {
    const directory = mkdtempSync(join(tmpdir(), 'woorden-scoring-'));
    try {
      const bad = join(directory, 'bad.json');
      const good = join(directory, 'good.json');
      writeFileSync(bad, JSON.stringify({ ...baseline, initial: 'unknown' }));
      writeFileSync(good, JSON.stringify(baseline));
      const run = spawnSync(process.execPath, ['tools/learning/inspect-scoring.ts', bad, good], {
        encoding: 'utf8',
      });
      expect(run.status).toBe(1);
      const rows = run.stdout
        .trim()
        .split('\n')
        .map((row): Classification => JSON.parse(row) as Classification);
      expect(rows[0]).toMatchObject({
        valid: false,
        proposedRatings: [],
        reasons: ['invalid_input'],
      });
      expect(rows[0]?.issues[0]).toContain('$/initial');
      expect(rows[1]?.proposedRatings).toEqual(['good']);
      writeFileSync(bad, '{');
      const malformed = spawnSync(process.execPath, ['tools/learning/inspect-scoring.ts', bad], {
        encoding: 'utf8',
      });
      expect(malformed.status).toBe(1);
      expect(malformed.stdout).toBe('');
      expect(malformed.stderr).toContain(bad);
      for (const args of [[], [join(directory, 'missing.json')]])
        expect(
          spawnSync(process.execPath, ['tools/learning/inspect-scoring.ts', ...args]).status,
        ).toBe(1);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
