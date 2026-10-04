// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import fixtures from '../../tests/fixtures/learning/eligibility/cases.json';
const root = fileURLToPath(new URL('../../', import.meta.url));
function run(values: unknown[]) {
  const dir = mkdtempSync(join(tmpdir(), 'eligibility-'));
  try {
    const paths = values.map((value, index) => {
      const path = join(dir, `${index}.json`);
      writeFileSync(path, JSON.stringify(value));
      return path;
    });
    return spawnSync(process.execPath, ['tools/learning/inspect-eligibility.ts', ...paths], {
      cwd: root,
      encoding: 'utf8',
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
it('T19: AC1 direct Node inspector prints literal late-night eligibility and optional window', () => {
  const result = run([fixtures[0]!.input]);
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  const row: unknown = JSON.parse(result.stdout);
  expect(row).toMatchObject(fixtures[0]!.expected);
});
it('T21: AC3 direct Node inspector preserves all literal DST/leap/midnight/skipped-date diagnostics', () => {
  const result = run(fixtures.map((f) => f.input));
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  const rows = result.stdout
    .trim()
    .split('\n')
    .map((line): unknown => JSON.parse(line));
  expect(rows).toHaveLength(fixtures.length);
  fixtures.forEach((fixture, index) =>
    expect(rows[index]).toMatchObject({
      ...fixture.expected,
      rawDueAt: fixture.input.rawDueAt,
      projectedInTimeZone: fixture.input.timeZone,
    }),
  );
});
it('W11: inspector rejects invalid files but continues with later valid input', () => {
  const result = run([{ ...fixtures[0]!.input, scheduledDays: 1.5 }, fixtures[0]!.input]);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('$/scheduledDays');
  expect(result.stdout.trim().split('\n')).toHaveLength(1);
});
it('W11: missing arguments and unreadable files have unsuccessful exit status', () => {
  for (const paths of [[], ['/missing-eligibility.json']]) {
    const result = spawnSync(
      process.execPath,
      ['tools/learning/inspect-eligibility.ts', ...paths],
      { cwd: root, encoding: 'utf8' },
    );
    expect(result.status).toBe(1);
    expect(result.stderr.length).toBeGreaterThan(0);
  }
});
