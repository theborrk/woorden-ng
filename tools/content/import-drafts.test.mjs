import { URL } from 'node:url';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { emptyDraftState, importDraftBatch } from './import-drafts.mjs';
import { digest, payloadHash } from './validate-entry.mjs';

const starterPath = '../../research/content-2026-10/content/starter-pack.json';
const starter = JSON.parse(readFileSync(new URL(starterPath, import.meta.url)));
function fixture() {
  const entry = structuredClone(starter.entries[0]);
  entry.forms = [];
  entry.examples = [];
  entry.lexeme.pronunciation.ipa = [];
  entry.lexeme.pronunciation.ipa_status = 'missing';
  entry.frequency.status = 'missing';
  for (const scope of Object.values(entry.provenance))
    if (scope.status === 'source_verified') scope.status = 'generated_draft';
  entry.content_sha256 = payloadHash(entry);
  return {
    schema_version: 'woorden-draft-batch-1',
    batch_id: 'external-01',
    generation: {
      vendor: 'OpenAI',
      model: null,
      version: null,
      run_ref: 'saved-test-artifact',
      prompt_sha256: 'a'.repeat(64),
      input_sha256: null,
    },
    entries: [entry],
  };
}
const bytes = (batch) => Buffer.from(JSON.stringify(batch));

describe('external draft batch imports', () => {
  it('W19: AC1 repeated batch preserves canonical IDs, counts, provenance and artifacts', () => {
    const batch = fixture();
    const first = importDraftBatch(bytes(batch));
    const second = importDraftBatch(bytes(batch), { state: first.state });
    expect(second.state).toEqual(first.state);
    expect(second.report.changes[0].action).toBe('unchanged');
    expect(second.report.entry_count).toBe(1);
    expect(first.state.entries[0].generation.provenance).toEqual(batch.generation);
    expect(first.state.entries[0].generation.actor).toBe(batch.entries[0].generation.actor);
    expect(first.state.artifacts).toEqual([
      {
        sha256: first.report.artifact_sha256,
        bytes: bytes(batch).length,
        batch_id: batch.batch_id,
      },
    ]);
    expect(first.state.batches[0].entries[0].content_sha256).toBe(
      first.state.entries[0].content_sha256,
    );
    expect(batch.entries[0].review.statuses.origin).toBeUndefined();
  });

  it('W20: AC1 new senses and shared lexemes allocate once without IDs based on text/order', () => {
    const batch = fixture();
    const firstEntry = batch.entries[0];
    firstEntry.fixture_ref = 'external-sense-a';
    firstEntry.id = firstEntry.sense.id = randomUUID();
    firstEntry.lexeme.id = firstEntry.sense.lexeme_id = randomUUID();
    const other = structuredClone(firstEntry);
    other.fixture_ref = 'external-sense-b';
    other.id = other.sense.id = randomUUID();
    batch.entries.push(other);
    const first = importDraftBatch(bytes(batch));
    expect(first.state.entries[0].id).not.toBe(firstEntry.id);
    expect(first.state.entries[0].lexeme.id).not.toBe(firstEntry.lexeme.id);
    expect(first.state.entries[0].lexeme.id).toBe(first.state.entries[1].lexeme.id);
    expect(first.state.entries[0].id).not.toBe(first.state.entries[1].id);
    batch.entries.reverse();
    firstEntry.lexeme.lemma = 'edited spelling';
    const second = importDraftBatch(bytes(batch), { state: first.state });
    expect(second.state.entries.map((e) => e.id)).toEqual(first.state.entries.map((e) => e.id));
    expect(second.state.entries).toHaveLength(2);
    expect(second.state.registry).toEqual(first.state.registry);
    expect(second.state.entries[0].lexeme.lemma).toBe('edited spelling');
  });

  it('T50: AC2 rejects language_reviewed, batch_checked and ai_reviewed producer claims', () => {
    for (const approval of ['language_reviewed', 'batch_checked', 'ai_reviewed']) {
      const batch = fixture();
      batch.entries[0].review.statuses.language_check = approval;
      const state = emptyDraftState();
      const before = structuredClone(state);
      expect(() => importDraftBatch(bytes(batch), { state })).toThrow(/approval rejected/);
      expect(state).toEqual(before);
    }
    for (const mutate of [
      (e) => {
        e.review.statuses.release = 'eligible';
      },
      (e) => {
        e.media.listening_task_eligible = true;
      },
    ]) {
      const batch = fixture();
      mutate(batch.entries[0]);
      expect(() => importDraftBatch(bytes(batch))).toThrow(/approval rejected/);
    }
    expect(importDraftBatch(bytes(fixture())).state.entries[0].review.statuses).toMatchObject({
      origin: 'generated_draft',
      language_check: 'not_run',
      ai_review: 'not_run',
      disposition: 'draft',
      release: 'blocked',
    });
  });

  it('F08: new forms/examples keep discontinuous spans and canonical target links', () => {
    const batch = fixture();
    const entry = structuredClone(starter.entries.find((e) => e.fixture_ref === 'S32'));
    entry.fixture_ref = 'external-separable';
    entry.id = entry.sense.id = randomUUID();
    entry.lexeme.id = entry.sense.lexeme_id = randomUUID();
    const form = entry.forms.find((f) => f.surface === 'neem mee');
    form.id = randomUUID();
    entry.forms = [form];
    entry.examples = [entry.examples[0]];
    const example = entry.examples[0];
    example.id = randomUUID();
    example.cue = {
      mode: 'fill_in',
      gloss: structuredClone(example.context),
      tense: 'present',
      person: 'first singular',
    };
    example.target_sense_id = entry.id;
    example.target_form_ids = [form.id];
    entry.lexeme.morphology.verb.forms = [form.id];
    entry.lexeme.morphology.verb.split_form_ids = [form.id];
    entry.lexeme.morphology.verb.perfect_auxiliaries.status = 'missing';
    entry.lexeme.pronunciation.ipa = [];
    entry.frequency.status = 'missing';
    for (const scope of Object.values(entry.provenance))
      if (scope.status === 'source_verified') scope.status = 'generated_draft';
    const record = { forms: [{ form: form.surface }] };
    const sourceId = form.source_ids[0];
    form.source_selector = '/forms/0';
    entry.sources.find((source) => source.id === sourceId).record_sha256 = digest(record);
    const evidence = {
      [entry.fixture_ref]: {
        records: { [sourceId]: record },
        claims: [{ pointer: '/forms/0/surface', source_id: sourceId, selector: '/forms/0/form' }],
      },
    };
    batch.entries = [entry];
    const first = importDraftBatch(bytes(batch), { evidence });
    const canonical = first.state.entries[0];
    expect(canonical.forms[0].id).not.toBe(form.id);
    expect(canonical.examples[0].target_form_ids).toEqual([canonical.forms[0].id]);
    expect(canonical.examples[0].target_sense_id).toBe(canonical.id);
    expect(canonical.lexeme.morphology.verb.split_form_ids).toEqual([canonical.forms[0].id]);
    expect(canonical.examples[0].answer_spans).toEqual(example.answer_spans);
    expect(canonical.examples[0].nl).toBe(example.nl);
    expect(importDraftBatch(bytes(batch), { evidence, state: first.state }).state).toEqual(
      first.state,
    );
    expect(() => importDraftBatch(bytes(batch))).toThrow(/pinned observation/);
  });

  it('T50: AC3 definition edits increment revisions and archive invalidated checks', () => {
    const batch = fixture();
    const first = importDraftBatch(bytes(batch));
    // An operator-owned state represents checks recorded by the separate review importer.
    const old = first.state.entries[0];
    old.review.statuses.language_check = 'batch_checked';
    old.review.verification_log.push({ stage: 'sample_check', content_sha256: old.content_sha256 });
    const identical = importDraftBatch(bytes(batch), { state: first.state });
    expect(identical.state.entries[0].review).toEqual(old.review);
    batch.entries[0].sense.definition_nl += ' (edited definition)';
    const second = importDraftBatch(bytes(batch), { state: first.state });
    const changed = second.state.entries[0];
    expect(changed.id).toBe(old.id);
    expect(changed.revision).toBe(old.revision + 1);
    expect(changed.content_sha256).not.toBe(old.content_sha256);
    expect(changed.content_sha256).toBe(payloadHash(changed));
    expect(changed.review.statuses.language_check).toBe('not_run');
    expect(changed.review.statuses.release).toBe('blocked');
    expect(changed.review.verification_log).toEqual([]);
    expect(second.state.history[0].entry).toEqual(old);
    expect(second.report.changes[0].reviews_invalidated).toBe(true);
    const third = importDraftBatch(bytes(batch), { state: second.state });
    expect(third.state).toEqual(second.state);
    expect(first.state.entries[0]).toEqual(old);
  });

  it('F08: invalid contracts, duplicate labels, identity changes and unsupported facts fail atomically', () => {
    for (const mutate of [
      (b) => {
        b.entries.push(structuredClone(b.entries[0]));
      },
      (b) => {
        b.entries[0].sense.id = randomUUID();
      },
      (b) => {
        b.entries[0].sense.confusion_links.push({ sense_id: randomUUID(), type: 'confusion' });
      },
      (b) => {
        b.entries[0].provenance['/sense'].status = 'source_verified';
      },
      (b) => {
        b.generation.vendor = '';
      },
      (b) => {
        b.schema_version = 'unknown';
      },
    ]) {
      const state = emptyDraftState();
      const before = structuredClone(state);
      const batch = fixture();
      mutate(batch);
      expect(() => importDraftBatch(bytes(batch), { state })).toThrow();
      expect(state).toEqual(before);
    }
    const batch = fixture();
    const first = importDraftBatch(bytes(batch));
    batch.entries[0].lexeme.id = batch.entries[0].sense.lexeme_id = randomUUID();
    expect(() => importDraftBatch(bytes(batch), { state: first.state })).toThrow(/move/);
  });

  it('W19: CLI preserves input/prior state, refuses overwrite and emits no partial failed output', () => {
    const dir = mkdtempSync(join(tmpdir(), 'woorden-drafts-'));
    const input = join(dir, 'batch.json');
    const output = join(dir, 'state.json');
    const secondOutput = join(dir, 'state-2.json');
    const run = (...args) =>
      spawnSync(process.execPath, ['tools/content/import-drafts.mjs', input, ...args], {
        encoding: 'utf8',
      });
    try {
      writeFileSync(input, bytes(fixture()));
      const original = readFileSync(input, 'utf8');
      const first = run('--output', output);
      expect(first.status).toBe(0);
      expect(JSON.parse(first.stdout).entry_count).toBe(1);
      const saved = readFileSync(output, 'utf8');
      expect(run('--state', output, '--output', secondOutput).status).toBe(0);
      expect(readFileSync(secondOutput, 'utf8')).toBe(saved);
      expect(run('--output', output).status).toBe(1);
      expect(readFileSync(output, 'utf8')).toBe(saved);
      expect(readFileSync(input, 'utf8')).toBe(original);
      writeFileSync(input, '{}');
      const badOutput = join(dir, 'failed.json');
      const failed = run('--output', badOutput);
      expect(failed.status).toBe(1);
      expect(failed.stdout).toBe('');
      expect(existsSync(badOutput)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
