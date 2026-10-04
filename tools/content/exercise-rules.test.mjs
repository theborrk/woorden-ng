import { URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { digest, inspectEntry, payloadHash, validateEntry } from './validate-entry.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const starter = read('../../research/content-2026-10/content/starter-pack.json');
// Synthetic observations isolate exercise checks from source-attestation checks. They are test
// evidence only, never replacements for the research's actual pinned dictionary records.
function draft(ref) {
  const entry = structuredClone(starter.entries.find((item) => item.fixture_ref === ref));
  entry.lexeme.pronunciation.ipa = [];
  entry.lexeme.pronunciation.ipa_status = 'missing';
  entry.frequency.status = 'missing';
  if (entry.lexeme.morphology.verb?.perfect_auxiliaries)
    entry.lexeme.morphology.verb.perfect_auxiliaries.status = 'missing';
  for (const evidence of Object.values(entry.provenance)) {
    if (evidence.status === 'source_verified') evidence.status = 'generated_draft';
  }
  const records = {};
  const claims = [];
  for (const [i, form] of entry.forms.entries()) {
    const source = form.source_ids[0];
    records[source] ??= { forms: [] };
    records[source].forms.push({ surface: form.surface });
    const j = records[source].forms.length - 1;
    delete form.source_selector;
    claims.push({
      pointer: `/forms/${i}/surface`,
      source_id: source,
      selector: `/forms/${j}/surface`,
    });
  }
  for (const source of entry.sources) {
    if (records[source.id]) source.record_sha256 = digest(records[source.id]);
  }
  entry.content_sha256 = payloadHash(entry);
  return { entry, context: { records, claims } };
}
function check({ entry, context }) {
  entry.content_sha256 = payloadHash(entry);
  return validateEntry(entry, context);
}
function verbCue(entry, en = 'be', pl = 'być') {
  entry.examples[0].cue = { mode: 'fill_in', gloss: { en, pl }, tense: 'present', person: 'ik' };
}
const findings = (report, rule) => report.findings?.filter((item) => item.rule === rule) ?? [];

describe('ADR 0005 exercise rules', () => {
  it('W18: AC1 S02 missing tense/person fails R1 and an explicit cue passes', () => {
    const data = draft('S02');
    expect(findings(check(data), 'R1')).toMatchObject([
      { entry_id: data.entry.id, example_id: data.entry.examples[0].id, field: '/examples/0/cue' },
    ]);
    verbCue(data.entry);
    expect(check(data)).toEqual({ valid: true, errors: [] });
    for (const field of ['tense', 'person']) {
      const changed = structuredClone(data);
      changed.entry.examples[0].cue[field] = '   ';
      expect(findings(check(changed), 'R1')).toHaveLength(1);
    }
  });

  it('W18: AC1 S04 single phrase answer fails R2 and recorded alternatives pass', () => {
    const data = draft('S04');
    expect(findings(check(data), 'R2')).toHaveLength(1);
    data.entry.examples[0].accepted_answers.push(
      { ordered_segments: ['Dank u'], case_sensitive: false },
      { ordered_segments: ['Hartelijk dank'], case_sensitive: false },
    );
    expect(check(data)).toEqual({ valid: true, errors: [] });
  });

  it('W24: AC1 S08 single sentence fails R2 and self-grading passes without conferring review', () => {
    const data = draft('S08');
    expect(findings(check(data), 'R2')).toHaveLength(1);
    data.entry.examples[0].self_graded = true;
    expect(check(data)).toEqual({ valid: true, errors: [] });
    expect(data.entry.review.statuses).toMatchObject({ ai_review: 'not_run', release: 'blocked' });
    const result = inspectEntry(data.entry, data.context);
    expect(result.eligibility.en.productive.eligible).toBe(false);
  });

  it('W18: AC1 S09 possess/posiadać fails scoped recorded R3 and corrected cues pass', () => {
    const data = draft('S09');
    verbCue(data.entry, 'have', 'mieć');
    expect(findings(check(data), 'R3').map((item) => item.field)).toEqual([
      '/examples/0/context/en',
      '/examples/0/context/pl',
    ]);
    data.entry.examples[0].context = { en: 'have (present tense)', pl: 'mieć (czas teraźniejszy)' };
    expect(check(data)).toEqual({ valid: true, errors: [] });
  });

  it('W18: AC2 S03 placeholder and predicative-attributive links name entry and field', () => {
    const data = draft('S03');
    const report = check(data);
    const placeholder = data.entry.forms.findIndex((form) => form.surface === '-');
    expect(findings(report, 'R4')).toMatchObject([
      { entry_id: data.entry.id, example_id: null, field: `/forms/${placeholder}/surface` },
      {
        entry_id: data.entry.id,
        example_id: data.entry.examples[0].id,
        field: '/examples/0/target_form_ids/1',
      },
    ]);
    data.entry.forms[placeholder].surface = '';
    expect(
      findings(check(data), 'R4').some((item) => item.field === `/forms/${placeholder}/surface`),
    ).toBe(true);
    const corrected = draft('S03');
    const formId = corrected.entry.forms.find((form) => form.surface === '-').id;
    corrected.entry.forms = corrected.entry.forms.filter((form) => form.id !== formId);
    corrected.entry.examples[0].target_form_ids = [corrected.entry.examples[0].target_form_ids[0]];
    // Removing an inventory record shifts exact synthetic evidence pointers.
    corrected.context.claims = corrected.entry.forms.map((form, i) => {
      const source = form.source_ids[0];
      const j = corrected.context.records[source].forms.findIndex(
        (item) => item.surface === form.surface,
      );
      return { pointer: `/forms/${i}/surface`, source_id: source, selector: `/forms/${j}/surface` };
    });
    expect(check(corrected)).toEqual({ valid: true, errors: [] });
  });

  it('W18: AC2 S07 meta wording fails R5 in both meanings and clean glosses pass', () => {
    const data = draft('S07');
    expect(findings(check(data), 'R5')).toMatchObject([
      { entry_id: data.entry.id, field: '/sense/meanings/en/0' },
      { entry_id: data.entry.id, field: '/sense/meanings/pl/0' },
    ]);
    data.entry.sense.meanings = { en: ['not'], pl: ['nie'] };
    expect(check(data)).toEqual({ valid: true, errors: [] });
  });

  it('T44: AC3 three accepted answers preserve the first NFC UTF-16 span round trip', () => {
    const data = draft('S08');
    const example = data.entry.examples[0];
    example.accepted_answers.push(
      { ordered_segments: ['Zou u dat kunnen herhalen'], case_sensitive: false },
      { ordered_segments: ['Kunt u dat nog een keer zeggen'], case_sensitive: false },
    );
    const before = JSON.stringify(data.entry);
    expect(validateEntry(data.entry, data.context).errors).toEqual([
      'hash: semantic payload mismatch',
    ]);
    expect(JSON.stringify(data.entry)).toBe(before);
    expect(check(data)).toEqual({ valid: true, errors: [] });
    expect(example.accepted_answers[0].ordered_segments).toEqual(
      example.answer_spans.map((span) => example.nl.slice(span.start, span.end)),
    );
    example.accepted_answers[0].ordered_segments = ['different'];
    expect(check(data).errors).toContain('spans: ordered answer mismatch');
  });

  it('W24: duplicated or punctuation-only alternative spellings do not satisfy R2', () => {
    const data = draft('S08');
    data.entry.examples[0].accepted_answers.push({
      ordered_segments: ['KUNT U DAT HERHALEN?'],
      case_sensitive: false,
    });
    expect(findings(check(data), 'R2')).toHaveLength(1);
  });

  it('W18: R3 compares normalized whole words in old and structured glosses', () => {
    const data = draft('S05');
    data.entry.examples[0].context = { en: 'you', pl: 'pan/pani' };
    expect(findings(check(data), 'R3')).toHaveLength(0);
    data.entry.examples[0].cue = { mode: 'fill_in', gloss: { en: 'You: U!', pl: null } };
    expect(findings(check(data), 'R3')).toMatchObject([{ field: '/examples/0/cue/gloss/en' }]);
    const verb = draft('S02');
    verbCue(verb.entry);
    verb.entry.examples[0].cue.gloss.en = 'use WAS here';
    expect(findings(check(verb), 'R3')).toMatchObject([{ field: '/examples/0/cue/gloss/en' }]);
  });

  it('W18: malformed cues, self-grade values and answer alternatives fail closed', () => {
    for (const mutate of [
      (example) => {
        example.cue = { mode: 'unknown', gloss: { en: 'test', pl: null } };
      },
      (example) => {
        example.self_graded = 'true';
      },
      (example) => {
        example.accepted_answers.push({ ordered_segments: [], case_sensitive: false });
      },
    ]) {
      const data = draft('S08');
      mutate(data.entry.examples[0]);
      expect(check(data).errors.some((error) => error.startsWith('schema:'))).toBe(true);
    }
  });

  it('W18: findings remain machine-readable with rule entry example and field', () => {
    const data = draft('S09');
    const report = JSON.parse(JSON.stringify(check(data)));
    expect(report.valid).toBe(false);
    for (const item of report.findings) {
      expect(item).toMatchObject({
        entry_id: data.entry.id,
        fixture_ref: 'S09',
        example_id: data.entry.examples[0].id,
      });
      expect(
        report.errors.some((error) =>
          error.startsWith(`${item.rule}:S09:${item.entry_id}:${item.example_id}:${item.field}:`),
        ),
      ).toBe(true);
    }
  });
});
