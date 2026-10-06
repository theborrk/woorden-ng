// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import fixture from '../../fixtures/learning/answers/house.json';
import { payloadHash } from '../../../tools/content/validate-entry.mjs';

it('T10: AC1/AC4 direct Node inspector proves normalization and separate components using a validated synthetic entry', () => {
  const dir = mkdtempSync(join(tmpdir(), 'woorden-answers-'));
  try {
    const normalized = structuredClone(fixture);
    const ex = normalized.entry.examples[0]!;
    ex.nl = 'één huis';
    ex.answer_spans = [
      { start: 0, end: 3, text: 'één' },
      { start: 4, end: 8, text: 'huis' },
    ];
    ex.accepted_answers = [
      { ordered_segments: ['één', 'huis'], case_sensitive: false },
      { ordered_segments: ['één', 'woning'], case_sensitive: false },
    ];
    normalized.contract.accepted_answers = ex.accepted_answers;
    normalized.response = 'e\u0301e\u0301n  huis!';
    normalized.entry.content_sha256 = payloadHash(normalized.entry);
    const values = [
      normalized,
      fixture,
      { ...fixture, response: 'Huis', contract: { ...fixture.contract, strictSpelling: true } },
      { ...fixture, response: 'home', contract: { ...fixture.contract, family: 'receptive' } },
    ];
    const paths = values.map((value, i) => {
      const path = join(dir, `${i}.json`);
      writeFileSync(path, JSON.stringify(value));
      return path;
    });
    const run = spawnSync(process.execPath, ['tools/learning/inspect-answer.ts', ...paths], {
      encoding: 'utf8',
    });
    expect(run.status, run.stderr).toBe(0);
    const reports: unknown[] = run.stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as unknown);
    expect(reports[0]).toMatchObject({ judgment: 'correct', inspectorOnly: true });
    expect(reports[1]).toMatchObject({
      judgment: 'correct',
      components: { lexical: 'correct', article: 'incorrect' },
    });
    expect(reports[2]).toMatchObject({
      judgment: 'incorrect',
      components: { lexical: 'correct', spelling: 'incorrect' },
    });
    expect(reports[3]).toMatchObject({
      judgment: 'self_assessment_required',
      components: { meaning: 'not_tested' },
    });
    for (const [i, path] of paths.entries())
      expect(readFileSync(path, 'utf8')).toBe(JSON.stringify(values[i]));
    const invalid = [
      { ...fixture, contract: { ...fixture.contract, acceptedArticles: ['de'] } },
      {
        ...fixture,
        contract: { ...fixture.contract, senseId: '604c9517-d603-45ca-b859-4e98dd122cbf' },
      },
      {
        ...fixture,
        contract: {
          ...fixture.contract,
          accepted_answers: [{ ordered_segments: ['wrong'], case_sensitive: false }],
        },
      },
      { ...fixture, entry: { ...fixture.entry, content_sha256: '0'.repeat(64) } },
      {
        ...fixture,
        contract: { ...fixture.contract, targetFormIds: ['604c9517-d603-45ca-b859-4e98dd122cbf'] },
      },
    ];
    for (const value of invalid) {
      writeFileSync(paths[0]!, JSON.stringify(value));
      const failed = spawnSync(process.execPath, ['tools/learning/inspect-answer.ts', paths[0]!], {
        encoding: 'utf8',
      });
      expect(failed.status).toBe(1);
      expect(failed.stdout).toBe('');
      expect(failed.stderr.length).toBeGreaterThan(0);
    }
    writeFileSync(paths[0]!, '{');
    expect(
      spawnSync(process.execPath, ['tools/learning/inspect-answer.ts', paths[0]!]).status,
    ).toBe(1);
    for (const args of [[], ['/missing-answer.json']])
      expect(
        spawnSync(process.execPath, ['tools/learning/inspect-answer.ts', ...args]).status,
      ).toBe(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
