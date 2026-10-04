// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import golden from '../../fixtures/runtime/canonical-golden.json';
import {
  fixture,
  fixtureNames,
  rejectionCases,
  reverseKeys,
} from '../../fixtures/runtime/support.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
function run(values: unknown[]) {
  const directory = mkdtempSync(join(tmpdir(), 'runtime-contracts-'));
  try {
    const files = values.map((value, i) => {
      const path = join(directory, `${i}.json`);
      writeFileSync(path, JSON.stringify(value));
      return path;
    });
    return spawnSync(process.execPath, ['tools/contracts/inspect-runtime.ts', ...files], {
      cwd: root,
      encoding: 'utf8',
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
describe('Node runtime file inspector', () => {
  it('I12: AC1 prints stable IDs and canonical bytes/hashes across reordered EN/PL/RU fixtures', () => {
    const names = ['profile', 'task', 'session', 'event'] as const;
    const result = run(names.flatMap((name) => [fixture(name), reverseKeys(fixture(name))]));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    const rows = result.stdout
      .trim()
      .split('\n')
      .map((line): unknown => JSON.parse(line));
    for (const [i, name] of names.entries()) {
      expect(rows[2 * i]).toEqual({
        kind: fixture(name).kind,
        identity: fixture(name).id,
        ...golden[name],
      });
      expect(rows[2 * i + 1]).toEqual(rows[2 * i]);
    }
  });
  it('I12: inspects all supported record variants directly with Node', () => {
    const result = run(fixtureNames.map(fixture));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.trim().split('\n')).toHaveLength(fixtureNames.length);
  });
  for (const { name, patch, field } of rejectionCases) {
    it(`I12: AC2 ${field} is reported with a failing process exit`, () => {
      const result = run([{ ...fixture(name), ...patch }]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(field);
      expect(result.stdout).toBe('');
    });
  }
  it('I12: a failed file keeps the overall exit unsuccessful while inspecting later valid files', () => {
    const result = run([{ ...fixture('profile'), formatVersion: 99 }, fixture('profile')]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('$/formatVersion');
    expect(result.stdout).toContain(golden.profile.sha256);
  });
  it('I12: missing arguments, unreadable files and malformed JSON exit unsuccessfully', () => {
    for (const args of [[], ['/missing-runtime-record.json']]) {
      const result = spawnSync(process.execPath, ['tools/contracts/inspect-runtime.ts', ...args], {
        cwd: root,
        encoding: 'utf8',
      });
      expect(result.status).toBe(1);
      expect(result.stderr.length).toBeGreaterThan(0);
    }
    const directory = mkdtempSync(join(tmpdir(), 'runtime-contracts-'));
    try {
      const file = join(directory, 'malformed.json');
      writeFileSync(file, '{');
      const result = spawnSync(process.execPath, ['tools/contracts/inspect-runtime.ts', file], {
        cwd: root,
        encoding: 'utf8',
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('malformed.json');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
