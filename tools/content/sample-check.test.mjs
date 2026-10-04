// @vitest-environment node
import { readFileSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { URL } from 'node:url';
import { spawnSync } from 'node:child_process';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { expect, it } from 'vitest';
import { exportSample } from './sample-check.mjs';
import { payloadHash } from './validate-entry.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const pilot = read('../../research/content-2026-10/content/starter-pack.json').entries;
const manifest = (entries) => ({
  batch_id: 'pilot-fixture',
  generation: { vendor: 'OpenAI' },
  entries: entries.map((e) => ({ id: e.id, content_sha256: e.content_sha256 })),
});
const packet = (entries, seed) => JSON.parse(exportSample(manifest(entries), entries, seed));

it('W19: AC1 packet bytes are reproducible; seed changes only random selection', () => {
  const bytes = exportSample(manifest(pilot), pilot, 42);
  expect(exportSample(manifest(pilot), pilot, 42)).toBe(bytes);
  const first = JSON.parse(bytes),
    second = packet(pilot, 43);
  const ids = (p, role) => p.entries.filter((e) => e.selection.includes(role)).map((e) => e.id);
  expect(ids(first, 'risk')).toEqual(ids(second, 'risk'));
  expect(ids(first, 'random')).not.toEqual(ids(second, 'random'));
  expect(first.batch_manifest).toEqual(second.batch_manifest);
  expect(first.exercise_rules).toEqual(second.exercise_rules);
  expect(first.questions).toEqual(second.questions);
});
it('W19: AC2 small batches are complete; larger batches have ten random and up to ten fixed risks', () => {
  for (const count of [1, 20])
    expect(
      packet(pilot.slice(0, count), 42)
        .entries.map((e) => e.id)
        .sort(),
    ).toEqual(
      pilot
        .slice(0, count)
        .map((e) => e.id)
        .sort(),
    );
  const large = packet(pilot, 42);
  expect(large.entries.filter((e) => e.selection.includes('random'))).toHaveLength(10);
  const risk = large.entries.filter((e) => e.selection.includes('risk'));
  expect(risk.length).toBeLessThanOrEqual(10);
  expect(risk.length).toBeGreaterThan(0);
  expect(risk.every((e) => e.risk_categories.length > 0)).toBe(true);
  expect(new Set(large.entries.map((e) => e.id)).size).toBe(large.entries.length);
  expect(large.batch_manifest.entries).toHaveLength(60);
});
it('T50: AC3 direct CLI pilot packet is blinded, compact and read-only', () => {
  const directory = mkdtempSync(join(tmpdir(), 'woorden-sample-'));
  try {
    const input = join(directory, 'entries.json'),
      batch = join(directory, 'manifest.json'),
      output = join(directory, 'packet.json');
    const entries = structuredClone(pilot);
    for (const e of entries) {
      e.examples[0].task_contract.author_verdict = 'injected';
      e.examples[0].self_check = 'injected';
      e.content_sha256 = payloadHash(e);
    }
    writeFileSync(input, JSON.stringify(entries));
    writeFileSync(batch, JSON.stringify(manifest(entries)));
    const originals = [readFileSync(input, 'utf8'), readFileSync(batch, 'utf8')];
    const run = spawnSync(
      process.execPath,
      [
        'tools/content/sample-check.mjs',
        batch,
        '--entries',
        input,
        '--seed',
        '42',
        '--output',
        output,
      ],
      { encoding: 'utf8' },
    );
    expect(run.status).toBe(0);
    const bytes = readFileSync(output),
      result = JSON.parse(bytes.toString());
    expect(run.stdout).toBe(bytes.toString());
    const total = [1, 2, 3, 4, 5, 6].reduce(
      (sum, i) =>
        sum +
        readFileSync(
          new URL(`../../research/content-2026-10/review/review-batch-0${i}.json`, import.meta.url),
        ).length,
      0,
    );
    expect(bytes.length).toBeLessThanOrEqual(total / 10);
    for (const e of result.entries) {
      expect(e.draft).not.toHaveProperty('review');
      expect(e.draft).not.toHaveProperty('generation');
      expect(JSON.stringify(e)).not.toMatch(
        /author_verdict|self_check|verification_log|source_records/,
      );
    }
    expect([readFileSync(input, 'utf8'), readFileSync(batch, 'utf8')]).toEqual(originals);
    expect(result.entries.some((e) => e.source_facts.length > 0)).toBe(true);
    expect(result.exercise_rules).toHaveLength(5);
    expect(result.questions).toHaveLength(3);
    const failedOutput = join(directory, 'failed.json');
    writeFileSync(
      batch,
      JSON.stringify({
        ...manifest(entries),
        entries: [{ id: entries[0].id, content_sha256: '0'.repeat(64) }],
      }),
    );
    const failed = spawnSync(
      process.execPath,
      [
        'tools/content/sample-check.mjs',
        batch,
        '--entries',
        input,
        '--seed',
        '42',
        '--output',
        failedOutput,
      ],
      { encoding: 'utf8' },
    );
    expect(failed.status).toBe(1);
    expect(failed.stdout).toBe('');
    expect(existsSync(failedOutput)).toBe(false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
it('W19: response schema requires fixes, uncertain reasons and recorded reviewer provenance', () => {
  const ajv = new Ajv({ strict: false });
  addFormats(ajv);
  const validate = ajv.compile(read('./schemas/sample-check-response.schema.json'));
  // Structural examples only; never stored as a language check or imported into content.
  const response = {
    schema_version: 'woorden-sample-response-1',
    batch_id: 'schema-test',
    batch_manifest_sha256: 'a'.repeat(64),
    seed: 42,
    reviewer: {
      vendor: 'Anthropic',
      model_id: null,
      run_ref: 'https://example.test/schema-fixture',
    },
    verdicts: [{ id: pilot[0].id, content_sha256: pilot[0].content_sha256, verdict: 'pass' }],
  };
  expect(validate(response)).toBe(true);
  const fix = {
    ...response.verdicts[0],
    verdict: 'fix',
    question: 'exercise',
    problem_type: 'ambiguous_cue',
    patches: [{ op: 'replace', path: '/sense/definition_nl', value: 'schema fixture' }],
  };
  expect(validate({ ...response, verdicts: [fix] })).toBe(true);
  expect(validate({ ...response, verdicts: [{ ...fix, patches: [] }] })).toBe(false);
  expect(
    validate({ ...response, verdicts: [{ ...fix, patches: [{ op: 'replace', path: '/sense' }] }] }),
  ).toBe(false);
  expect(
    validate({ ...response, verdicts: [{ ...response.verdicts[0], verdict: 'unsure' }] }),
  ).toBe(false);
  expect(
    validate({
      ...response,
      verdicts: [{ ...response.verdicts[0], verdict: 'unsure', reason: 'Cannot settle fixture' }],
    }),
  ).toBe(true);
  expect(validate({ ...response, seed: 1.5 })).toBe(false);
});
it('W19: missing/stale/duplicate hashes and unsafe seeds fail before export', () => {
  for (const seed of [NaN, 1.5, Number.MAX_SAFE_INTEGER + 1])
    expect(() => exportSample(manifest(pilot), pilot, seed)).toThrow();
  expect(() => exportSample(manifest(pilot), [], 1)).toThrow(/Missing/);
  expect(() => exportSample(manifest([pilot[0], pilot[0]]), pilot, 1)).toThrow(/Duplicate/);
});
