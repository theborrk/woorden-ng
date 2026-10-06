// @vitest-environment node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { preparePilot } from './prepare-pilot.mjs';
import { exerciseFindings } from './exercise-rules.mjs';
import { digest, payloadHash, validateEntry } from './validate-entry.mjs';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const original = read('research/content-2026-10/content/starter-pack.json');
const changes = read('content/pilot/exercise-patches.json');
const prepared = read('content/pilot/pilot.json');
const report = read('content/pilot/report.json');
it('W20: AC1 all sixty revised pilot entries pass R1–R5 while sourced facts remain byte-identical or archived as placeholders', () => {
  expect(prepared.entries).toHaveLength(60);
  expect(new Set(prepared.entries.map((e) => e.id)).size).toBe(60);
  expect(original.entries.some((e) => exerciseFindings(e).length > 0)).toBe(true);
  for (const entry of prepared.entries) {
    const before = original.entries.find((e) => e.id === entry.id);
    expect(exerciseFindings(entry)).toEqual([]);
    // Actual source attestation is separate; this task changes only the authored exercise rules.
    const errors = validateEntry(entry).errors.filter((e) => /^(R[1-5]|schema:|hash:)/u.test(e));
    expect(errors, entry.fixture_ref).toEqual([]);
    for (const field of ['lexeme', 'sources', 'provenance', 'frequency', 'cefr', 'legacy'])
      expect(JSON.stringify(entry[field]), `${entry.fixture_ref}/${field}`).toBe(
        JSON.stringify(before[field]),
      );
    const archived = report.archived_forms
      .filter((f) => f.entry_id === entry.id)
      .map((f) => f.form);
    for (const form of before.forms)
      expect(JSON.stringify([...entry.forms, ...archived].find((f) => f.id === form.id))).toBe(
        JSON.stringify(form),
      );
    expect(entry.forms.every((f) => !/^[-–—]+$/u.test(f.surface))).toBe(true);
    expect(payloadHash(entry)).toBe(entry.content_sha256);
  }
  expect(report.archived_forms.length).toBeGreaterThan(0);
  expect(spawnSync(process.execPath, ['tools/content/prepare-pilot.mjs', '--check']).status).toBe(
    0,
  );
});
it('F08: AC2 a reproducible generation batch records every edit, its rule and old/new hash without conferring approval', () => {
  const before = JSON.stringify(original);
  const result = preparePilot(original, changes);
  expect(result.pilot).toEqual(prepared);
  expect(result.report).toEqual(report);
  expect(JSON.stringify(original)).toBe(before);
  expect(report.total).toBe(60);
  expect(report.changed).toBe(Object.keys(changes).length);
  expect(report.generation).toMatchObject({
    vendor: 'OpenAI',
    model: null,
    version: null,
    input_sha256: digest(original),
    output_sha256: digest(prepared),
  });
  const batch = read('content/pilot/batch.json');
  expect(batch).toEqual(result.batch);
  expect(batch.entries).toEqual(prepared.entries);
  for (const item of report.entries) {
    const entry = prepared.entries.find((e) => e.id === item.id);
    expect(item.old_hash).toBe(original.entries.find((e) => e.id === item.id).content_sha256);
    expect(item.new_hash).toBe(entry.content_sha256);
    if (item.changed) {
      expect(item.rules.length).toBeGreaterThan(0);
      expect(item.old_hash).not.toBe(item.new_hash);
      expect(entry.review.statuses.language_check).toBe('not_run');
      expect(entry.revision).toBe(original.entries.find((e) => e.id === item.id).revision + 1);
    } else expect(item.old_hash).toBe(item.new_hash);
    expect(entry.review.statuses).toMatchObject({ ai_review: 'not_run', release: 'blocked' });
  }
});
it('W20: batch 01 rule patches and subsequent equivalents remain explicit authoring candidates', () => {
  for (const ref of ['S02', 'S03', 'S04', 'S06', 'S07', 'S08', 'S09']) {
    const review = read(`research/content-2026-10/review/responses/work-01/${ref}.json`);
    const dimensions =
      ref === 'S03'
        ? ['dictionary_facts', 'span_form_contract']
        : ref === 'S07'
          ? ['en_pl_translation']
          : ['task_ambiguity'];
    for (const dimension of dimensions)
      for (const patch of review.dimensions[dimension].proposed_patch ?? [])
        expect(
          changes[ref].map(({ op, path, value }) => ({
            op,
            path,
            ...(value === undefined ? {} : { value }),
          })),
        ).toContainEqual(patch);
  }
  for (const ref of ['S27', 'S33', 'S34', 'S35', 'S40', 'S43', 'S58'])
    expect(prepared.entries.find((e) => e.fixture_ref === ref).examples[0].self_graded).toBe(true);
  expect(
    prepared.entries.find((e) => e.fixture_ref === 'S06').examples[0].accepted_answers,
  ).toContainEqual({ ordered_segments: ['snap'], case_sensitive: false });
  expect(prepared.entries.find((e) => e.fixture_ref === 'S54').examples[2].cue.person).toBe('u');
});
