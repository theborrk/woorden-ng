// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, it } from 'vitest';
import lesson from '../../fixtures/external-practice/lesson.json';
import claim from '../../fixtures/external-practice/observation.json';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const fixture = (name: string) => join(root, 'tests/fixtures/external-practice', name);
const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});
function inspect(mode: string, ...files: string[]) {
  return spawnSync(
    process.execPath,
    ['tools/contracts/inspect-external-practice.ts', mode, ...files],
    {
      cwd: root,
      // A clean child environment proves no provider configuration is needed.
      env: {},
      encoding: 'utf8',
    },
  );
}
function temporaryFixture(value: unknown) {
  const directory = mkdtempSync(join(tmpdir(), 'external-practice-'));
  directories.push(directory);
  const path = join(directory, 'input.json');
  writeFileSync(path, JSON.stringify(value));
  return path;
}

it('T73: AC1 direct Node inspector preserves the complete current lesson and graduated hints', () => {
  const result = inspect('session', fixture('lesson.json'));
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  expect(JSON.parse(result.stdout) as unknown).toEqual({ valid: true, package: lesson });
});

it('I23: inspector shows unknown help, duplicate/conflict results and exclusion from grading', () => {
  for (const [previous, duplicate] of [
    [[], 'new'],
    [[fixture('observation.json')], 'identical'],
    [[fixture('observation-conflict.json')], 'conflict'],
  ] as const) {
    const result = inspect('observation', fixture('observation.json'), ...previous);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout) as unknown).toEqual({
      valid: true,
      observation: claim,
      duplicate,
      gradingEligible: false,
      reason: expect.stringContaining('not app-observed graded attempts') as unknown,
    });
  }
});

for (const [mode, fixtureValue, required] of [
  ['session', lesson, ['sessionId', 'profileId', 'createdAt', 'schemaVersion', 'contentRevision']],
  [
    'observation',
    claim,
    [
      'id',
      'sessionId',
      'profileId',
      'senseId',
      'taskId',
      'occurredAt',
      'schemaVersion',
      'payloadVersion',
      'payloadHash',
      'reportingSource',
      'contentRevision',
    ],
  ],
] as const) {
  it.each(required)(`T73: AC4 ${mode} inspector fails offline when %s is missing`, (field) => {
    const input: Record<string, unknown> = { ...fixtureValue };
    delete input[field];
    const result = inspect(mode, temporaryFixture(input));
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr) as unknown).toEqual({
      valid: false,
      error: expect.stringContaining(`$.${field}`) as unknown,
    });
  });
}

it('T73: AC4 inspector rejects missing nested target IDs and reporting-source identity', () => {
  const first = lesson.lessons[0]!;
  for (const field of ['senseId', 'taskId']) {
    const target: Record<string, unknown> = { ...first };
    delete target[field];
    const result = inspect('session', temporaryFixture({ ...lesson, lessons: [target] }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`$.lessons[0].${field}`);
  }
  const result = inspect(
    'observation',
    temporaryFixture({ ...claim, reportingSource: { kind: 'learner_report' } }),
  );
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('$.reportingSource.id');
});

it('T73: inspector reports malformed JSON, absent files and invalid invocation', () => {
  const file = temporaryFixture(null);
  writeFileSync(file, '{');
  for (const result of [
    inspect('session', file),
    inspect('session', `${file}.missing`),
    inspect('bad-mode'),
  ]) {
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stderr) as unknown).toEqual({
      valid: false,
      error: expect.any(String) as unknown,
    });
  }
});
