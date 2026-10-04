// @vitest-environment node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { URL } from 'node:url';
import { expect, it } from 'vitest';
import { inspectionSlice } from './import-starter-inspection.mjs';
import { registry, payloadHash } from './validate-entry.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const research = read('../../research/content-2026-10/content/starter-pack.json');
const imported = read('../../content/inspection/starter-s01-s10.json');
const complete = read('../../content/inspection/starter-s01-s60.json');
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
it('W20: AC1 full fixture accounts for sixty senses, sixty-five translated examples and exact NFC/UTF-16 answer spans', () => {
  const before = JSON.stringify(research);
  expect(inspectionSlice(research.entries, 60)).toEqual(complete);
  expect(complete.entries).toEqual(research.entries);
  expect(complete.entries).toHaveLength(60);
  expect(new Set(complete.entries.map((e) => e.id)).size).toBe(60);
  const examples = complete.entries.flatMap((entry) => entry.examples);
  expect(examples).toHaveLength(65);
  expect(new Set(examples.map((example) => example.id)).size).toBe(65);
  for (const example of examples) {
    expect(example.translations.en).toBeTruthy();
    expect(example.translations.pl).toBeTruthy();
    expect(example.nl.normalize('NFC')).toBe(example.nl);
    expect(example.offset_unit).toBe('UTF-16-code-units');
    expect(example.answer_spans.map((s) => example.nl.slice(s.start, s.end))).toEqual(
      example.accepted_answers[0].ordered_segments,
    );
  }
  expect(complete.assessment).toEqual(imported.assessment);
  expect(
    complete.entries.every(
      (entry) =>
        entry.review.statuses.release === 'blocked' &&
        entry.review.statuses.ai_review === 'not_run',
    ),
  ).toBe(true);
  expect(JSON.stringify(research)).toBe(before);
  const check = spawnSync(
    process.execPath,
    ['tools/content/import-starter-inspection.mjs', '--check', '--all'],
    { encoding: 'utf8' },
  );
  expect(check.status, check.stderr).toBe(0);
});
it('W20: shared bank/alsjeblieft identities merge evidence without overwriting sense-specific observations', () => {
  for (const lemma of ['bank', 'alsjeblieft']) {
    const senses = complete.entries.filter((entry) => entry.lexeme.lemma === lemma);
    const entity = complete.shared_entities.lexemes.find((lexeme) => lexeme.lemma === lemma);
    expect(entity.sense_ids).toEqual(senses.map((entry) => entry.id));
    expect(new Set(senses.map((entry) => entry.lexeme.id)).size).toBe(1);
    expect(new Set(senses.map((entry) => entry.id)).size).toBe(2);
    expect(entity.observations.map((observation) => observation.lexeme)).toEqual(
      senses.map((entry) => entry.lexeme),
    );
    expect(senses[0].sense.meanings).not.toEqual(senses[1].sense.meanings);
    expect(senses[0].examples).not.toEqual(senses[1].examples);
  }
  const bank = complete.shared_entities.lexemes.find((entity) => entity.lemma === 'bank');
  expect(bank.source_ids).toEqual(expect.arrayContaining(['en:52', 'en:53']));
  const forms = complete.shared_entities.forms.filter((form) => form.lexeme_id === bank.id);
  expect(forms).toHaveLength(2);
  for (const form of forms) {
    expect(form.observations).toHaveLength(2);
    expect(form.source_ids).toEqual(expect.arrayContaining(['en:52', 'en:53']));
    expect(form.observations.every((observation) => observation.form.id === form.id)).toBe(true);
  }
});
it('T43: AC3 joined, discontinuous and reflexive targets retain explicit forms, pronouns, offsets and contracts', () => {
  const expected = {
    meenemen: [['neem', 'mee'], ['meenemen']],
    opstaan: [['sta', 'op'], ['opstaan']],
    invullen: [['vul', 'in'], ['invullen']],
    inschrijven: [
      ['schrijf', 'me', 'in'],
      ['me', 'inschrijven'],
      ['schrijft', 'zich', 'in'],
    ],
  };
  for (const [lemma, segments] of Object.entries(expected)) {
    const entry = complete.entries.find((e) => e.lexeme.lemma === lemma);
    expect(entry.lexeme.morphology.verb.joined_infinitive).toBe(lemma);
    expect(entry.lexeme.morphology.verb.separable).toBe(true);
    expect(entry.examples.map((example) => example.answer_spans.map((s) => s.text))).toEqual(
      segments,
    );
    expect(
      entry.examples.every(
        (e) =>
          e.target_form_ids.length > 0 &&
          e.target_form_ids.every((id) => entry.forms.some((form) => form.id === id)),
      ),
    ).toBe(true);
    expect(entry.forms.every((form) => form.grading_enabled === false)).toBe(true);
    expect(entry.examples.map((e) => e.task_contract)).toEqual(
      research.entries.find((e) => e.id === entry.id).examples.map((e) => e.task_contract),
    );
  }
  const reflexive = complete.entries.find((e) => e.lexeme.lemma === 'inschrijven').lexeme.morphology
    .verb;
  expect(reflexive.reflexive).toBe(true);
  expect(reflexive.reflexive_pattern).toMatchObject({ subject_ik: 'me', subject_u: 'zich' });
});
it('T43: corrupted answer offsets or missing translations fail even after rehashing; missing remaining senses fail closed', () => {
  for (const mutate of [
    (e) => {
      e.examples[0].answer_spans[0].start++;
    },
    (e) => {
      e.examples[0].translations.pl = null;
    },
    (e) => {
      e.examples[0].target_form_ids = ['unknown'];
    },
  ]) {
    const entries = structuredClone(research.entries);
    const entry = entries.find((e) => e.fixture_ref === 'S54');
    mutate(entry);
    entry.content_sha256 = payloadHash(entry);
    expect(() => inspectionSlice(entries, 60)).toThrow(/identity\/hash|contract|span/);
  }
  expect(() => inspectionSlice(research.entries.slice(0, 59), 60)).toThrow(/Missing/);
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
