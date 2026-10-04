// @vitest-environment node
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { importDraftBatch } from './import-drafts.mjs';
import { exportSample } from './sample-check.mjs';
import { importSampleCheck } from './import-sample-check.mjs';
import { payloadHash } from './validate-entry.mjs';

// Synthetic test responses only: these never approve the real research pilot.
const original = JSON.parse(
  readFileSync(
    new URL('../../research/content-2026-10/content/starter-pack.json', import.meta.url),
  ),
).entries[0];
const bytes = (value) => Buffer.from(JSON.stringify(value));
function fixture(count = 25) {
  const batch = {
    schema_version: 'woorden-draft-batch-1',
    batch_id: 'synthetic-test-batch',
    generation: {
      vendor: 'OpenAI',
      model: null,
      version: null,
      run_ref: 'test-only',
      prompt_sha256: null,
      input_sha256: null,
    },
    entries: Array.from({ length: count }, (_, i) => {
      const entry = structuredClone(original);
      entry.fixture_ref = `sample-test-${i}`;
      entry.id = entry.sense.id = randomUUID();
      entry.lexeme.id = entry.sense.lexeme_id = randomUUID();
      entry.lexeme.lemma = `fixture-${i}`;
      entry.forms = [];
      entry.examples = [];
      entry.lexeme.pronunciation.ipa = [];
      entry.lexeme.pronunciation.ipa_status = 'missing';
      entry.frequency.status = 'missing';
      entry.review.risk_categories = [];
      for (const scope of Object.values(entry.provenance))
        if (scope.status === 'source_verified') scope.status = 'generated_draft';
      entry.content_sha256 = payloadHash(entry);
      return entry;
    }),
  };
  const { state } = importDraftBatch(bytes(batch));
  const packet = JSON.parse(exportSample(state.batches[0], state.entries, 42));
  const response = {
    schema_version: 'woorden-sample-response-1',
    batch_id: packet.batch_manifest.batch_id,
    batch_manifest_sha256: packet.batch_manifest_sha256,
    seed: packet.seed,
    reviewer: {
      vendor: 'Anthropic',
      model_id: null,
      run_ref: 'https://example.test/synthetic-review',
    },
    verdicts: packet.entries.map(({ id, content_sha256 }) => ({
      id,
      content_sha256,
      verdict: 'pass',
    })),
  };
  return { batch, state, packet, response };
}
function fix(verdict, problem = 'ambiguous_cue') {
  Object.assign(verdict, {
    verdict: 'fix',
    question: 'exercise',
    problem_type: problem,
    patches: [{ op: 'replace', path: '/sense/definition_nl', value: 'synthetic correction' }],
  });
}
it('T50: AC1 same/unknown author vendor, stale hashes, missing/duplicate/foreign verdicts reject atomically', () => {
  for (const mutate of [
    (f) => {
      f.response.reviewer.vendor = ' openai ';
    },
    (f) => {
      f.state.batches[0].generation.vendor = null;
    },
    (f) => {
      f.response.verdicts[0].content_sha256 = '0'.repeat(64);
    },
    (f) => {
      f.state.entries[0].sense.definition_nl += ' changed';
    },
    (f) => {
      f.response.verdicts.pop();
    },
    (f) => {
      f.response.verdicts.push(f.response.verdicts[0]);
    },
    (f) => {
      f.response.verdicts[0].id = randomUUID();
    },
    (f) => {
      f.response.seed++;
    },
    (f) => {
      f.response.batch_id = 'other';
    },
    (f) => {
      f.response.batch_manifest_sha256 = '0'.repeat(64);
    },
    (f) => {
      f.packet.entries[0].selection = ['risk'];
    },
    (f) => {
      f.response.verdicts[0].verdict = 'fix';
    },
  ]) {
    const f = fixture();
    mutate(f);
    const before = structuredClone(f.state);
    expect(() => importSampleCheck(bytes(f.response), f)).toThrow();
    expect(f.state).toEqual(before);
  }
});
it('W19: AC2 passing response assigns all four states and retains raw evidence and patches without applying them', () => {
  const f = fixture();
  fix(f.response.verdicts[1]);
  Object.assign(f.response.verdicts[2], { verdict: 'unsure', reason: 'Synthetic ambiguity' });
  const artifact = Buffer.from(JSON.stringify(f.response, null, 2) + '\n');
  const result = importSampleCheck(artifact, f);
  expect(result.report.outcome).toBe('passed');
  const entry = (i) => result.state.entries.find((e) => e.id === f.response.verdicts[i].id);
  expect(entry(0).review.statuses.language_check).toBe('ai_reviewed');
  expect(entry(1).review.statuses.language_check).toBe('revision_requested');
  expect(entry(1).review.verification_log[0].verdict.patches).toEqual(
    f.response.verdicts[1].patches,
  );
  expect(entry(1).sense.definition_nl).toBe(original.sense.definition_nl);
  expect(entry(2).review.statuses).toMatchObject({
    language_check: 'uncertain',
    disposition: 'flagged',
    release: 'blocked',
  });
  const unsampled = result.state.entries.filter(
    (e) => !f.packet.entries.some((s) => s.id === e.id),
  );
  expect(unsampled).toHaveLength(15);
  expect(unsampled.every((e) => e.review.statuses.language_check === 'batch_checked')).toBe(true);
  expect(result.state.sample_checks[0]).toMatchObject({
    raw_response: artifact.toString(),
    response_sha256: createHash('sha256').update(artifact).digest('hex'),
    packet: f.packet,
    result: result.report,
  });
  expect(f.state.entries.every((e) => e.review.statuses.language_check === 'not_run')).toBe(true);
  expect(result.state.entries.every((e) => e.content_sha256 === payloadHash(e))).toBe(true);
});
it('W19: AC2 repeated problem types fail the batch with no checked entries', () => {
  const f = fixture();
  fix(f.response.verdicts[0]);
  fix(f.response.verdicts[1], ' Ambiguous_Cue ');
  const result = importSampleCheck(bytes(f.response), f);
  expect(result.report.outcome).toBe('failed');
  expect(result.report.systematic_problems.ambiguous_cue).toHaveLength(2);
  expect(result.state.entries.every((e) => e.review.statuses.language_check === 'not_run')).toBe(
    true,
  );
  expect(result.state.sample_checks).toHaveLength(1);
});
it('W19: a wrong meaning in a risk entry fails even without a repeated problem', () => {
  const f = fixture();
  f.batch.entries[0].review.risk_categories = ['polish_false_friend'];
  f.state = importDraftBatch(bytes(f.batch)).state;
  f.packet = JSON.parse(exportSample(f.state.batches[0], f.state.entries, 42));
  f.response.batch_manifest_sha256 = f.packet.batch_manifest_sha256;
  f.response.verdicts = f.packet.entries.map(({ id, content_sha256 }) => ({
    id,
    content_sha256,
    verdict: 'pass',
  }));
  const target = f.response.verdicts.find((v) => v.id === f.state.entries[0].id);
  fix(target, 'wrong_translation');
  target.question = 'meaning_translation';
  expect(importSampleCheck(bytes(f.response), f).report).toMatchObject({
    outcome: 'failed',
    risk_meaning_errors: [target.id],
  });
});
it('T50: AC3 draft import integration preserves identical checks, resets only the edited entry and rejects stale replay', () => {
  const f = fixture();
  const artifact = bytes(f.response);
  const checked = importSampleCheck(artifact, f);
  expect(importSampleCheck(artifact, { ...f, state: checked.state })).toEqual(checked);
  expect(importDraftBatch(bytes(f.batch), { state: checked.state }).state).toEqual(checked.state);
  const target = f.batch.entries.find(
    (e) =>
      e.fixture_ref ===
      checked.state.entries.find((e) => e.id === f.response.verdicts[0].id).fixture_ref,
  );
  target.sense.definition_nl += ' test edit';
  const edited = importDraftBatch(bytes(f.batch), { state: checked.state }).state;
  for (const entry of edited.entries) {
    const old = checked.state.entries.find((e) => e.id === entry.id);
    if (entry.fixture_ref === target.fixture_ref) {
      expect(entry.review.statuses.language_check).toBe('not_run');
      expect(entry.content_sha256).not.toBe(old.content_sha256);
    } else expect(entry).toEqual(old);
  }
  expect(edited.history[0].entry.review).toEqual(
    checked.state.entries.find((e) => e.fixture_ref === target.fixture_ref).review,
  );
  expect(edited.sample_checks).toEqual(checked.state.sample_checks);
  expect(() => importSampleCheck(artifact, { ...f, state: edited })).toThrow(/stale/);
});
it('W19: CLI dry-run and saved import are read-only on inputs; errors create no output and existing outputs survive', () => {
  const dir = mkdtempSync(join(tmpdir(), 'woorden-sample-import-'));
  try {
    const f = fixture(2);
    for (const key of ['state', 'packet', 'response'])
      writeFileSync(join(dir, key + '.json'), bytes(f[key]));
    const inputs = ['state', 'packet', 'response'].map((key) =>
      readFileSync(join(dir, key + '.json'), 'utf8'),
    );
    const output = join(dir, 'output.json');
    const run = (...args) =>
      spawnSync(
        process.execPath,
        [
          'tools/content/import-sample-check.mjs',
          join(dir, 'response.json'),
          '--packet',
          join(dir, 'packet.json'),
          '--state',
          join(dir, 'state.json'),
          ...args,
        ],
        { encoding: 'utf8' },
      );
    expect(run('--dry-run').status).toBe(0);
    expect(existsSync(output)).toBe(false);
    const saved = run('--output', output);
    expect(saved.status).toBe(0);
    expect(JSON.parse(saved.stdout).outcome).toBe('passed');
    const content = readFileSync(output, 'utf8');
    expect(run('--output', output).status).toBe(1);
    expect(readFileSync(output, 'utf8')).toBe(content);
    expect(
      ['state', 'packet', 'response'].map((key) => readFileSync(join(dir, key + '.json'), 'utf8')),
    ).toEqual(inputs);
    f.response.reviewer.vendor = 'OpenAI';
    writeFileSync(join(dir, 'response.json'), bytes(f.response));
    const failed = run('--output', join(dir, 'failed.json'));
    expect(failed.status).toBe(1);
    expect(failed.stdout).toBe('');
    expect(existsSync(join(dir, 'failed.json'))).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
