// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import fixture from '../../tests/fixtures/learning/evidence/recap.json';

it('I10: AC1 direct Node inspector retains recap gate, resource, phase and raw scheduler without input writes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evidence-'));
  try {
    const file = join(dir, 'recap.json');
    const bytes = JSON.stringify(fixture);
    writeFileSync(file, bytes);
    const result = spawnSync(process.execPath, ['tools/learning/inspect-evidence.ts', file], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      cleanGapMs: 60_000,
      relevantExposures: fixture.evidence.exposures,
      eligibility: { rawDueAt: fixture.eligibility.rawDueAt, eligibleAt: '2026-10-02T12:09:00Z' },
    });
    expect(readFileSync(file, 'utf8')).toBe(bytes);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it('T29: AC4 direct Node reports missing history honestly and continues after malformed input', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evidence-'));
  try {
    const bad = join(dir, 'bad.json'),
      good = join(dir, 'missing.json');
    writeFileSync(bad, '{');
    writeFileSync(
      good,
      JSON.stringify({ ...fixture, evidence: { ...fixture.evidence, exposureHistory: 'missing' } }),
    );
    const result = spawnSync(process.execPath, ['tools/learning/inspect-evidence.ts', bad, good], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('bad.json');
    expect(JSON.parse(result.stdout)).toMatchObject({
      historyComplete: false,
      cleanGapMs: null,
      evidenceStatus: 'acquiring',
      uncertainty: ['missing_exposure_history_or_introduction'],
    });
    expect(readFileSync(bad, 'utf8')).toBe('{');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it('W11: missing arguments, unreadable input and invalid envelope produce no successful output', () => {
  for (const args of [
    [],
    ['/missing-evidence.json'],
    ['tests/fixtures/learning/eligibility/late-night.json'],
  ]) {
    const result = spawnSync(process.execPath, ['tools/learning/inspect-evidence.ts', ...args], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).not.toBe('');
  }
});
