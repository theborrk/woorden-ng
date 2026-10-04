// @vitest-environment node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { URL } from 'node:url';
import { expect, it } from 'vitest';
import { inspectionSlice } from './import-starter-inspection.mjs';
import { registry } from './validate-entry.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const research = read('../../research/content-2026-10/content/starter-pack.json');
const imported = read('../../content/inspection/starter-s01-s10.json');
it('W20: first ten inspection drafts retain issued IDs, original content and blocked assessment', () => {
  expect(inspectionSlice(research.entries)).toEqual(imported);
  expect(imported.entries).toEqual(research.entries.slice(0, 10));
  expect(imported.entries.every((e) => e.id === registry[`sense:${e.fixture_ref}`])).toBe(true);
  expect(imported.inspection_only).toBe(true);
  expect(imported.assessment).toEqual({
    origin: 'generated_draft',
    structure: 'unchecked',
    language_check: 'not_run',
    release: 'blocked',
    source_evidence: 'research_assertions_only',
  });
  expect(
    spawnSync(process.execPath, ['tools/content/import-starter-inspection.mjs', '--check']).status,
  ).toBe(0);
});
it('W20: changed or missing issued research identities fail before importing', () => {
  expect(() => inspectionSlice(research.entries.slice(1))).toThrow(/Missing/);
  const entries = structuredClone(research.entries);
  entries[0].sense.definition_nl += ' changed';
  expect(() => inspectionSlice(entries)).toThrow(/identity\/hash/);
  const ids = structuredClone(research.entries);
  ids[0].id = ids[1].id;
  expect(() => inspectionSlice(ids)).toThrow(/identity\/hash/);
});
