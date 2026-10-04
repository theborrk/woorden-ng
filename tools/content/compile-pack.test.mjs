// @vitest-environment node
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { compilePack, taskEligibility } from './compile-pack.mjs';
import { importDraftBatch } from './import-drafts.mjs';
import { importSampleCheck } from './import-sample-check.mjs';
import { exportSample } from './sample-check.mjs';
import { digest, payloadHash } from './validate-entry.mjs';

const pilot = JSON.parse(
  readFileSync(
    new URL('../../research/content-2026-10/content/starter-pack.json', import.meta.url),
  ),
);
const bytes = (value) => Buffer.from(JSON.stringify(value));
const options = { packId: '10000000-0000-4000-8000-000000000001', version: 'test-1' };
// Synthetic checks only; no real research entry acquires a fabricated review.
function fixture(count = 25, ref = 'S01') {
  const evidence = {};
  const batch = {
    schema_version: 'woorden-draft-batch-1',
    batch_id: 'synthetic-compiler-tests',
    generation: {
      vendor: 'OpenAI',
      model: null,
      version: null,
      run_ref: 'test-only',
      prompt_sha256: null,
      input_sha256: null,
    },
    entries: Array.from({ length: count }, (_, i) => {
      const entry = structuredClone(pilot.entries.find((e) => e.fixture_ref === ref));
      entry.fixture_ref = `compiler-test-${i}`;
      entry.id = entry.sense.id = randomUUID();
      entry.lexeme.id = entry.sense.lexeme_id = randomUUID();
      entry.lexeme.lemma = `fixture-${i}`;
      entry.examples = [];
      entry.forms = [];
      entry.lexeme.pronunciation.ipa = [];
      entry.lexeme.pronunciation.ipa_status = 'missing';
      entry.frequency.status = 'missing';
      for (const scope of Object.values(entry.provenance))
        if (scope.status === 'source_verified') scope.status = 'generated_draft';
      if (entry.lexeme.morphology.noun) {
        entry.lexeme.morphology.noun.plural.status = 'missing';
        entry.lexeme.morphology.noun.diminutive.status = 'missing';
      }
      if (entry.lexeme.morphology.verb) {
        const original = pilot.entries.find((e) => e.fixture_ref === ref);
        entry.forms = [structuredClone(original.forms.find((f) => f.surface === 'neem mee'))];
        entry.examples = [structuredClone(original.examples[0])];
        entry.examples[0].cue = {
          mode: 'fill_in',
          gloss: structuredClone(entry.examples[0].context),
          tense: 'present',
          person: 'first singular',
        };
        entry.examples[0].target_sense_id = entry.id;
        entry.examples[0].target_form_ids = [entry.forms[0].id];
        entry.lexeme.morphology.verb.forms = [entry.forms[0].id];
        entry.lexeme.morphology.verb.split_form_ids = [entry.forms[0].id];
        entry.lexeme.morphology.verb.perfect_auxiliaries.status = 'missing';
      }
      const sourceId = entry.provenance['/lexeme/lemma'].source_ids[0];
      const record = { lemma: entry.lexeme.lemma };
      entry.provenance['/lexeme/lemma'].status = 'source_verified';
      const claims = [{ pointer: '/lexeme/lemma', source_id: sourceId, selector: '/lemma' }];
      if (entry.lexeme.morphology.noun) {
        record.article = entry.lexeme.morphology.noun.article;
        claims.push({
          pointer: '/lexeme/morphology/noun/article',
          source_id: sourceId,
          selector: '/article',
        });
      }
      if (entry.forms.length) {
        record.forms = [{ form: entry.forms[0].surface }];
        entry.forms[0].source_selector = '/forms/0';
        entry.forms[0].source_ids = [sourceId];
        claims.push({
          pointer: '/forms/0/surface',
          source_id: sourceId,
          selector: '/forms/0/form',
        });
      }
      entry.sources.find((s) => s.id === sourceId).record_sha256 = digest(record);
      evidence[entry.fixture_ref] = { records: { [sourceId]: record }, claims };
      entry.content_sha256 = payloadHash(entry);
      return entry;
    }),
  };
  const imported = importDraftBatch(bytes(batch), { evidence });
  const packet = JSON.parse(exportSample(imported.state.batches[0], imported.state.entries, 42));
  const response = {
    schema_version: 'woorden-sample-response-1',
    batch_id: packet.batch_manifest.batch_id,
    batch_manifest_sha256: packet.batch_manifest_sha256,
    seed: packet.seed,
    reviewer: {
      vendor: 'Anthropic',
      model_id: null,
      run_ref: 'https://example.test/synthetic-check',
    },
    verdicts: packet.entries.map(({ id, content_sha256 }) => ({
      id,
      content_sha256,
      verdict: 'pass',
    })),
  };
  const state = importSampleCheck(bytes(response), { packet, state: imported.state }).state;
  return { state, batch, evidence, packet, response };
}
it('T43: AC1 batch_checked written entries compile without audio, while listening/picture/form/cloze gates remain separate', () => {
  const f = fixture();
  const before = JSON.stringify(f.state);
  const result = compilePack(f.state, { ...options, evidence: f.evidence });
  expect(result.report.eligible_entries).toBe(25);
  const unsampled = result.pack.entries.find(
    ({ entry }) => entry.review.statuses.language_check === 'batch_checked',
  );
  expect(unsampled.tasks.map((t) => `${t.family}:${t.locale}`)).toEqual([
    'receptive:en',
    'productive:en',
    'receptive:pl',
    'productive:pl',
  ]);
  expect(result.report.entries[0].tasks.en.listening.blockers).toContain('tested_audio_required');
  expect(result.report.entries[0].tasks.en.picture.blockers).toContain(
    'reviewed_referent_image_required',
  );
  expect(result.report.entries[0].tasks.en.cloze.blockers).toContain('checked_example_en_required');
  expect(result.report.entries[0].tasks.en.verb_form.blockers).toContain(
    'source_verified_form_and_example_required',
  );
  expect(result.manifest.pack_sha256).toBe(digest(result.pack));
  expect(result.manifest.entries[0].artifact_sha256).toBe(digest(result.pack.entries[0].entry));
  expect(JSON.stringify(f.state)).toBe(before);
  expect(compilePack(f.state, { ...options, evidence: f.evidence })).toEqual(result);
});
it('T50: AC2 direct CLI compilation of the real 60-entry pilot produces zero curated entries and concrete blockers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'compile-pilot-'));
  try {
    const path = 'research/content-2026-10/content/starter-pack.json';
    const original = readFileSync(path, 'utf8');
    const output = join(dir, 'pack.json');
    const run = spawnSync(
      process.execPath,
      [
        'tools/content/compile-pack.mjs',
        path,
        '--id',
        options.packId,
        '--version',
        'pilot-inspection',
        '--output',
        output,
      ],
      { encoding: 'utf8' },
    );
    expect(run.status, run.stderr).toBe(0);
    const result = JSON.parse(readFileSync(output, 'utf8'));
    expect(result.pack.entries).toEqual([]);
    expect(result.excluded).toHaveLength(60);
    expect(result.report).toMatchObject({
      total_entries: 60,
      eligible_entries: 0,
      eligible_tasks: 0,
    });
    for (const entry of result.report.entries)
      for (const tasks of Object.values(entry.tasks))
        for (const task of Object.values(tasks))
          expect(task.blockers).toContain('current_sample_check_required');
    expect(result.excluded.map((e) => e.id).sort()).toEqual(pilot.entries.map((e) => e.id).sort());
    expect(readFileSync(path, 'utf8')).toBe(original);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it('T50: AC3 a changed payload with recomputed hash, a stale hash, flagged and uncertain entries cannot use older checks', () => {
  for (const mutate of [
    (e) => {
      e.sense.definition_nl += ' test edit';
      e.content_sha256 = payloadHash(e);
    },
    (e) => {
      e.sense.definition_nl += ' test edit';
    },
    (e) => {
      e.review.statuses.disposition = 'flagged';
    },
    (e) => {
      e.review.statuses.language_check = 'uncertain';
    },
  ]) {
    const f = fixture(2);
    mutate(f.state.entries[0]);
    const result = compilePack(f.state, { ...options, evidence: f.evidence });
    expect(result.excluded.some((e) => e.id === f.state.entries[0].id)).toBe(true);
    expect(
      result.report.entries.find((e) => e.id === f.state.entries[0].id).tasks.en.receptive.eligible,
    ).toBe(false);
  }
});
it('T50: producer approval strings, forged results and corrupted raw responses never replace actual receipt verification', () => {
  for (const mutate of [
    (s) => {
      s.sample_checks = [];
    },
    (s) => {
      s.sample_checks[0].result.outcome = 'failed';
    },
    (s) => {
      s.sample_checks[0].raw_response = '{}';
    },
    (s) => {
      s.sample_checks[0].response_sha256 = '0'.repeat(64);
    },
    (s) => {
      s.entries.forEach((e) => {
        e.review.verification_log = [];
      });
    },
  ]) {
    const f = fixture(2);
    mutate(f.state);
    expect(compilePack(f.state, { ...options, evidence: f.evidence }).pack.entries).toEqual([]);
  }
});
it('T43: locale and article gates require their own data and sources, with no fallback or global media requirement', () => {
  const f = fixture(1, 'S10');
  const result = compilePack(f.state, { ...options, evidence: f.evidence });
  expect(result.pack.entries[0].tasks.some((t) => t.family === 'article')).toBe(true);
  const entry = f.state.entries[0];
  const validation = { valid: true };
  const languageCheck = { status: 'ai_reviewed', content_sha256: entry.content_sha256 };
  entry.sense.meanings.pl = null;
  let decisions = taskEligibility(entry, {
    validation,
    languageCheck,
    evidence: f.evidence[entry.fixture_ref],
  });
  expect(decisions.en.receptive.eligible).toBe(false); // Edit is not rehashed or checked.
  entry.content_sha256 = payloadHash(entry);
  expect(
    taskEligibility(entry, { validation, languageCheck, evidence: f.evidence[entry.fixture_ref] })
      .en.receptive.eligible,
  ).toBe(false);
  // Test the locale gate with a separately supplied current synthetic check.
  languageCheck.content_sha256 = entry.content_sha256;
  decisions = taskEligibility(entry, {
    validation,
    languageCheck,
    evidence: f.evidence[entry.fixture_ref],
  });
  expect(decisions.en.receptive.eligible).toBe(true);
  expect(decisions.pl.receptive.blockers).toContain('missing_meaning_pl');
  expect(decisions.en.article.eligible).toBe(true);
  const context = structuredClone(f.evidence);
  context[entry.fixture_ref].claims = context[entry.fixture_ref].claims.filter(
    (c) => c.pointer === '/lexeme/lemma',
  );
  decisions = taskEligibility(entry, {
    validation,
    languageCheck,
    evidence: context[entry.fixture_ref],
  });
  expect(decisions.en.article.blockers).toContain('source_verified_article_required');
  expect(decisions.en.receptive.eligible).toBe(true);
});
it('T50: archived reviews keep an unchanged sibling eligible after an ordinary draft edit', () => {
  const f = fixture(2);
  f.batch.entries[0].sense.definition_nl += ' test edit';
  const edited = importDraftBatch(bytes(f.batch), { state: f.state, evidence: f.evidence }).state;
  const result = compilePack(edited, { ...options, evidence: f.evidence });
  expect(result.pack.entries).toHaveLength(1);
  expect(result.excluded).toHaveLength(1);
  expect(result.pack.entries[0].entry.id).toBe(edited.entries[1].id);
});
it('T43: form/cloze variants carry only supported form and locale-specific example references', () => {
  const f = fixture(1, 'S32');
  const result = compilePack(f.state, { ...options, evidence: f.evidence });
  const compiled = result.pack.entries[0];
  for (const task of compiled.tasks.filter((t) => ['verb_form', 'cloze'].includes(t.family))) {
    expect(task.form_ids).toEqual([compiled.entry.forms[0].id]);
    expect(task.example_ids).toEqual([compiled.entry.examples[0].id]);
  }
  expect(compiled.tasks.filter((t) => ['verb_form', 'cloze'].includes(t.family))).toHaveLength(4);
  const context = structuredClone(f.evidence);
  context[compiled.entry.fixture_ref].claims = context[compiled.entry.fixture_ref].claims.filter(
    (c) => c.pointer === '/lexeme/lemma',
  );
  const missingForms = compilePack(f.state, { ...options, evidence: context });
  expect(
    missingForms.pack.entries[0].tasks.every((t) => !['verb_form', 'cloze'].includes(t.family)),
  ).toBe(true);
  expect(missingForms.pack.entries[0].tasks.some((t) => t.family === 'productive')).toBe(true);
});
it('T43: media-dependent tasks require separate current-hash QA assessments, not candidate URLs or producer flags', () => {
  const f = fixture(1),
    entry = f.state.entries[0];
  const audio = {
    id: 'synthetic-audio',
    target: 'lemma',
    text: entry.lexeme.lemma,
    inspection: 'pcm_wav_verified',
    download_status: 'downloaded',
    mime: 'audio/wav',
    duration_ms: 1000,
    size_bytes: 16044,
    kind: 'audio',
    entry_id: entry.id,
    content_sha256: entry.content_sha256,
    available: true,
    qa: 'passed',
    qa_run_ref: 'https://example.test/synthetic-qa',
    license: 'test-only',
    sha256: 'a'.repeat(64),
  };
  const picture = { ...audio, id: 'synthetic-picture', kind: 'referent_image' };
  const result = compilePack(f.state, {
    ...options,
    evidence: f.evidence,
    media: [audio, picture],
  });
  expect(result.pack.entries[0].tasks.some((t) => t.family === 'listening')).toBe(true);
  expect(result.pack.entries[0].tasks.some((t) => t.family === 'picture')).toBe(true);
  expect(result.pack.media).toEqual([audio, picture]);
  for (const patch of [
    { qa: 'not_run' },
    { content_sha256: '0'.repeat(64) },
    { available: false },
    { license: null },
    { kind: 'mnemonic_image' },
  ]) {
    const blocked = compilePack(f.state, {
      ...options,
      evidence: f.evidence,
      media: [{ ...audio, ...patch }],
    });
    expect(
      blocked.pack.entries[0].tasks.every(
        (t) => !['listening', 'spelling', 'picture'].includes(t.family),
      ),
    ).toBe(true);
    expect(blocked.pack.entries[0].tasks.some((t) => t.family === 'receptive')).toBe(true);
  }
});
it('W18: CLI refuses overwrites and duplicate IDs without partial output', () => {
  const dir = mkdtempSync(join(tmpdir(), 'compile-cli-'));
  try {
    const f = fixture(2),
      input = join(dir, 'state.json'),
      output = join(dir, 'output.json');
    writeFileSync(input, bytes(f.state));
    writeFileSync(output, 'prior output');
    const run = (path) =>
      spawnSync(
        process.execPath,
        [
          'tools/content/compile-pack.mjs',
          input,
          '--id',
          options.packId,
          '--version',
          'test',
          '--output',
          path,
        ],
        { encoding: 'utf8' },
      );
    expect(run(output).status).toBe(1);
    expect(readFileSync(output, 'utf8')).toBe('prior output');
    f.state.entries.push(f.state.entries[0]);
    writeFileSync(input, bytes(f.state));
    const failed = join(dir, 'failed.json');
    expect(run(failed).status).toBe(1);
    expect(existsSync(failed)).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
