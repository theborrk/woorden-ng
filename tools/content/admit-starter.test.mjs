import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { admitStarter } from './admit-starter.mjs';
import { compilePack } from './compile-pack.mjs';
import { importDraftBatch } from './import-drafts.mjs';

const pilotPath = 'content/pilot/pilot.json';
const batchPath = 'content/pilot/batch.json';
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
describe('actual starter admission boundary', () => {
  it('T50: AC1 absent current response names the blocker and admits none of the sixty real drafts', () => {
    const pilot = read(pilotPath);
    const batch = read(batchPath);
    const responsePath = `research/content-2026-10/review/sample-checks/${batch.batch_id}.json`;
    const original = JSON.stringify(pilot);
    expect(pilot.entries).toHaveLength(60);
    const report = admitStarter({
      state: pilot,
      response: null,
      responsePath,
      packId: pilot.pack_id,
      version: pilot.version,
    });
    expect(report).toEqual({
      status: 'blocked',
      blockers: [`Missing committed sample-check response: ${responsePath}`],
      eligible_entries: 0,
      eligible_tasks: 0,
    });
    expect(report).not.toHaveProperty('compilation');
    const compiled = compilePack(pilot, { packId: pilot.pack_id, version: pilot.version });
    expect(compiled.pack.entries).toEqual([]);
    expect(compiled.report.eligible_entries).toBe(0);
    expect(compiled.report.eligible_tasks).toBe(0);
    expect(
      compiled.report.entries.every((e) =>
        Object.values(e.tasks).every((families) =>
          Object.values(families).every((task) =>
            task.blockers.includes('current_sample_check_required'),
          ),
        ),
      ),
    ).toBe(true);
    expect(JSON.stringify(pilot)).toBe(original);
  });
  it('T50: AC1 direct Node admission reports the real missing response without touching pilot/research inputs', () => {
    const batch = read(batchPath);
    const responsePath = `research/content-2026-10/review/sample-checks/${batch.batch_id}.json`;
    const paths = [pilotPath, batchPath, 'research/content-2026-10/review/sample-checks/README.md'];
    const before = paths.map((path) => readFileSync(path, 'utf8'));
    const run = spawnSync(process.execPath, ['tools/content/admit-starter.mjs'], {
      encoding: 'utf8',
    });
    expect(run.status, run.stderr).toBe(1);
    expect(run.stderr).toBe('');
    expect(JSON.parse(run.stdout)).toMatchObject({
      status: 'blocked',
      eligible_entries: 0,
      eligible_tasks: 0,
      blockers: [`Missing committed sample-check response: ${responsePath}`],
    });
    expect(paths.map((path) => readFileSync(path, 'utf8'))).toEqual(before);
  });
  it('F08: the current pilot still requires actual source-attestation bundles for the draft importer', () => {
    expect(() => importDraftBatch(readFileSync(batchPath))).toThrow('source:');
  });
});
