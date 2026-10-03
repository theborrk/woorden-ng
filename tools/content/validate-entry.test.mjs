import { URL } from 'node:url';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import {
  digest,
  inspectEntry,
  payloadHash,
  pointerValue,
  registry,
  resolveProvenance,
  validateEntry,
} from './validate-entry.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const starter = read('../../research/content-2026-10/content/starter-pack.json');

// A narrowed test draft retains issued identities and original example text. It makes no
// claim that the research's source groups or language have received production verification.
function fixture() {
  const entry = structuredClone(starter.entries.find((e) => e.fixture_ref === 'S32'));
  const form = entry.forms.find((f) => f.surface === 'neem mee');
  entry.forms = [form];
  entry.examples = [entry.examples[0]];
  entry.lexeme.morphology.verb.split_form_ids = [form.id];
  entry.lexeme.morphology.verb.forms = [form.id];
  entry.lexeme.pronunciation.ipa = [];
  entry.lexeme.pronunciation.ipa_status = 'missing';
  entry.frequency.status = 'missing';
  entry.lexeme.morphology.verb.perfect_auxiliaries.status = 'missing';
  for (const evidence of Object.values(entry.provenance)) {
    if (evidence.status === 'source_verified') evidence.status = 'generated_draft';
  }
  const record = { forms: [{ form: 'neem mee' }] };
  form.source_selector = '/forms/0';
  entry.sources.find((s) => s.id === form.source_ids[0]).record_sha256 = digest(record);
  const context = {
    records: { [form.source_ids[0]]: record },
    claims: [
      { pointer: '/forms/0/surface', source_id: form.source_ids[0], selector: '/forms/0/form' },
    ],
  };
  entry.content_sha256 = payloadHash(entry);
  return { entry, context };
}
const rehash = (entry) => {
  entry.content_sha256 = payloadHash(entry);
};
const report = (entry, context) => {
  rehash(entry);
  return inspectEntry(entry, context);
};

describe('one-sense exchange validation', () => {
  it('F08: AC1 discontinuous separable segments round-trip and link to the intended sense/form', () => {
    const { entry, context } = fixture();
    expect(validateEntry(entry, context)).toEqual({ valid: true, errors: [] });
    const ex = entry.examples[0];
    expect(ex.answer_spans.map((s) => ex.nl.slice(s.start, s.end))).toEqual(['neem', 'mee']);
    expect(ex.accepted_answers[0].ordered_segments).toEqual(['neem', 'mee']);
    expect(ex.target_sense_id).toBe(entry.sense.id);
    expect(entry.forms.find((f) => f.id === ex.target_form_ids[0]).surface).toBe('neem mee');
    for (const mutate of [
      (e) => {
        e.examples[0].answer_spans.reverse();
      },
      (e) => {
        e.examples[0].answer_spans[1].start = 6;
      },
      (e) => {
        e.examples[0].answer_spans[0].end = 99;
      },
      (e) => {
        e.examples[0].accepted_answers[0].ordered_segments.reverse();
      },
      (e) => {
        e.examples[0].target_sense_id = e.lexeme.id;
      },
      (e) => {
        e.examples[0].target_form_ids = [e.lexeme.id];
      },
      (e) => {
        e.forms[0].surface = 'nam mee';
      },
      (e) => {
        e.forms[0].source_selector = '/forms/99';
      },
      (e) => {
        e.forms[0].features.source_tags.push('obsolete');
      },
    ]) {
      const changed = structuredClone(entry);
      mutate(changed);
      expect(report(changed, context).valid).toBe(false);
    }
  });

  it('F08: spans use NFC and UTF-16 units, including astral characters before the target', () => {
    const { entry, context } = fixture();
    entry.examples[0].nl = `😀 ${entry.examples[0].nl}`;
    for (const span of entry.examples[0].answer_spans) {
      span.start += 3;
      span.end += 3;
    }
    expect(report(entry, context).valid).toBe(true);
    entry.examples[0].answer_spans[0].start -= 1;
    expect(report(entry, context).valid).toBe(false);
    const nonNfc = fixture();
    nonNfc.entry.examples[0].nl += ' e\u0301';
    expect(report(nonNfc.entry, nonNfc.context).errors).toContain(
      'spans: text must already be NFC',
    );
  });

  it('T50: AC2 importing an invented source_verified fact rejects missing, stale or wrong scoped evidence', () => {
    const { entry, context } = fixture();
    expect(validateEntry(entry).valid).toBe(false);
    entry.provenance['/sense/definition_nl'] = {
      source_ids: [entry.sources[0].id],
      method: 'invented',
      status: 'source_verified',
    };
    expect(
      report(entry, context).errors.some((e) =>
        e.includes('/sense/definition_nl lacks a pinned observation'),
      ),
    ).toBe(true);
    const clean = fixture();
    clean.context.records[clean.entry.forms[0].source_ids[0]].forms[0].form = 'nam mee';
    expect(report(clean.entry, clean.context).valid).toBe(false);
    const wrongScope = fixture();
    wrongScope.context.claims[0].pointer = '/lexeme/display';
    expect(report(wrongScope.entry, wrongScope.context).valid).toBe(false);
    const dangling = fixture();
    dangling.entry.forms[0].source_ids = ['invented-source'];
    expect(report(dangling.entry, dangling.context).valid).toBe(false);
    const hidden = fixture();
    hidden.entry.hints.etymology = { status: 'source_verified', text: 'invented' };
    expect(report(hidden.entry, hidden.context).valid).toBe(false);
  });

  it('W18: JSON-pointer prefixes, escaped tokens and item overrides preserve exact scope', () => {
    const { entry, context } = fixture();
    expect(resolveProvenance(entry, '/sense/meanings/en')).toBe(entry.provenance['/sense']);
    expect(resolveProvenance(entry, '/sensex')).toBeUndefined();
    entry.provenance['/sense/meanings/en'] = {
      source_ids: [],
      method: 'missing',
      status: 'missing',
    };
    expect(resolveProvenance(entry, '/sense/meanings/en/0').status).toBe('missing');
    expect(resolveProvenance(entry, '/forms/0/surface')).toBe(entry.forms[0]);
    expect(pointerValue({ 'a/b': { '~x': 2 } }, '/a~1b/~0x')).toBe(2);
    const sourceId = entry.forms[0].source_ids[0];
    context.records[sourceId].meanings = { en: entry.sense.meanings.en };
    entry.sources.find((s) => s.id === sourceId).record_sha256 = digest(context.records[sourceId]);
    entry.provenance['/sense/meanings/en'] = {
      source_ids: [sourceId],
      method: 'source_extraction',
      status: 'source_verified',
    };
    context.claims.push({
      pointer: '/sense/meanings/en',
      source_id: sourceId,
      selector: '/meanings/en',
    });
    expect(report(entry, context).valid).toBe(true);
    expect(resolveProvenance(entry, '/sense/meanings/pl').status).toBe('generated_draft');
    entry.provenance['/not~2valid'] = { source_ids: [], method: 'invalid', status: 'missing' };
    expect(report(entry, context).valid).toBe(false);
  });

  it('T43: AC3 missing PL/example/audio blocks only dependent families without fabricating content', () => {
    const { entry, context } = fixture();
    entry.sense.meanings.pl = null;
    entry.examples = [];
    entry.lexeme.pronunciation.ipa = [];
    rehash(entry);
    const before = JSON.stringify(entry);
    const result = inspectEntry(entry, context);
    expect(result.valid).toBe(true);
    expect(result.eligibility.en.receptive.data_ready).toBe(true);
    expect(result.eligibility.en.productive.data_ready).toBe(true);
    expect(result.eligibility.pl.receptive.blockers).toContain('missing_meaning_pl');
    expect(result.eligibility.en.cloze.blockers).toContain('missing_example_en');
    expect(result.eligibility.en.verb_form.blockers).toContain('missing_form_or_example');
    expect(result.eligibility.en.listening.blockers).toContain('tested_audio_required');
    expect(result.eligibility.en.spelling.blockers).toContain('tested_audio_required');
    expect(JSON.stringify(entry)).toBe(before);
    for (const tasks of Object.values(result.eligibility))
      for (const task of Object.values(tasks)) {
        expect(task.eligible).toBe(false);
        expect(task.blockers).toContain('independent_review_required');
      }
  });

  it('T43: missing example PL translation does not disable English written tasks', () => {
    const { entry, context } = fixture();
    entry.examples[0].translations.pl = null;
    const result = report(entry, context);
    expect(result.valid).toBe(true);
    expect(result.eligibility.en.cloze.data_ready).toBe(true);
    expect(result.eligibility.pl.cloze.data_ready).toBe(false);
    expect(result.eligibility.pl.receptive.data_ready).toBe(true);
  });

  it('T50: imported draft review and release claims cannot self-certify', () => {
    for (const mutate of [
      (e) => {
        e.review.statuses.ai_review = 'ai_reviewed';
      },
      (e) => {
        e.review.statuses.release = 'eligible';
      },
      (e) => {
        e.examples[0].review_status = 'ai_reviewed';
      },
      (e) => {
        e.forms[0].grading_enabled = true;
      },
    ]) {
      const { entry, context } = fixture();
      mutate(entry);
      expect(report(entry, context).valid).toBe(false);
    }
  });

  it('W18: registry IDs survive spelling edits while changed IDs and payloads are rejected', () => {
    expect(registry).toMatchObject(read('../../research/content-2026-10/content/id-registry.json'));
    const { entry, context } = fixture();
    entry.lexeme.lemma = 'editorial spelling';
    expect(report(entry, context).valid).toBe(true);
    entry.id = entry.lexeme.id;
    expect(report(entry, context).valid).toBe(false);
    const wrongLexeme = fixture();
    wrongLexeme.entry.lexeme.id = starter.entries[0].lexeme.id;
    wrongLexeme.entry.sense.lexeme_id = wrongLexeme.entry.lexeme.id;
    expect(report(wrongLexeme.entry, wrongLexeme.context).valid).toBe(false);
    const legacy = fixture();
    legacy.entry.legacy[0].original_ru = 'rewritten';
    expect(report(legacy.entry, legacy.context).valid).toBe(false);
    const stale = fixture();
    stale.entry.sense.definition_nl += '!';
    expect(validateEntry(stale.entry, stale.context).errors).toContain(
      'hash: semantic payload mismatch',
    );
    for (const original of starter.entries)
      expect(payloadHash(original)).toBe(original.content_sha256);
  });

  it('W18: malformed imports fail schema validation and the CLI reports blockers read-only', () => {
    expect(inspectEntry({})).toMatchObject({ valid: false, eligibility: null });
    const malformed = fixture();
    malformed.entry.review.statuses = null;
    expect(inspectEntry(malformed.entry, malformed.context)).toMatchObject({
      valid: false,
      eligibility: null,
    });
    const { entry, context } = fixture();
    const dir = mkdtempSync(join(tmpdir(), 'woorden-entry-'));
    try {
      const path = join(dir, 'entry.json');
      const evidence = join(dir, 'evidence.json');
      writeFileSync(path, JSON.stringify(entry));
      writeFileSync(evidence, JSON.stringify(context));
      const run = spawnSync(
        process.execPath,
        ['tools/content/validate-entry.mjs', path, evidence],
        { encoding: 'utf8' },
      );
      expect(run.status).toBe(0);
      expect(JSON.parse(run.stdout).eligibility.en.cloze.data_ready).toBe(true);
      expect(JSON.parse(run.stdout).eligibility.en.cloze.eligible).toBe(false);
      const rejected = spawnSync(process.execPath, ['tools/content/validate-entry.mjs', path], {
        encoding: 'utf8',
      });
      expect(rejected.status).toBe(1);
      expect(JSON.parse(rejected.stdout).valid).toBe(false);
      expect(readFileSync(path, 'utf8')).toBe(JSON.stringify(entry));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
