// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { inspectSource, validateManifest } from './inspect-source.mjs';

const dir = 'tests/fixtures/content-sources/';
const source = `${dir}nt2lex-excerpt.tsv`;
const raw = readFileSync(source);
const metadata = JSON.parse(readFileSync(`${dir}metadata.json`, 'utf8'));
const expectedText = readFileSync(`${dir}manifest.json`, 'utf8');
const expected = JSON.parse(expectedText);
const directories = [];
afterEach(() =>
  directories.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })),
);
function workspace() {
  const path = mkdtempSync(join(tmpdir(), 'source-inspection-'));
  directories.push(path);
  return path;
}
function cli(file, flag, input) {
  return spawnSync(
    'npm',
    ['--silent', 'run', 'content:sources', '--', 'inspect', file, flag, input],
    { encoding: 'utf8' },
  );
}

describe('local source manifests', () => {
  it('W18: AC1 stable unit identity and checksums preserve the pinned excerpt bytes and record hashes', async () => {
    const original = readFileSync('research/content-2026-10/evidence/sources/nt2lex-basic.tsv');
    expect(original.subarray(0, raw.length)).toEqual(raw);
    const lines = raw.toString().split('\n').slice(0, -1);
    const records = JSON.parse(readFileSync(`${dir}records.json`, 'utf8'));
    expect(records).toEqual(
      lines.map((line, index) => ({
        source_line: index + 1,
        sha256: createHash('sha256').update(`${line}\n`).digest('hex'),
      })),
    );
    expect(await inspectSource(source, metadata)).toEqual(expected);
    expect(await inspectSource(source, metadata, expected)).toEqual(expected);
    const relocated = join(workspace(), 'renamed.tsv');
    writeFileSync(relocated, raw);
    expect(await inspectSource(relocated, metadata, expected)).toEqual(expected);
    expect(readFileSync(source)).toEqual(raw);
    expect(expected.bytes).toBe(raw.length);
    expect(expected.sha256).toBe(createHash('sha256').update(raw).digest('hex'));
  });

  it('F08: AC1 two npm CLI inspections print the same reviewable manifest, usable as an expected pin', () => {
    for (let i = 0; i < 2; i++) {
      const result = cli(source, '--metadata', `${dir}metadata.json`);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toBe(expectedText);
      expect(JSON.parse(result.stdout)).toEqual(expected);
    }
    const result = cli(source, '--expected', `${dir}manifest.json`);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe(expectedText);
    expect(Object.keys(expected)).toEqual([
      'schema_version',
      'source_id',
      'url',
      'retrieved_at',
      'bytes',
      'sha256',
      'format',
      'version',
      'lineage',
    ]);
  });

  it.each(['truncated', 'changed'])(
    'W18: AC2 %s bytes fail unit and CLI inspection without adopting or changing the pin',
    async (kind) => {
      const path = workspace();
      const file = join(path, 'source.tsv');
      const pin = join(path, 'manifest.json');
      const altered = kind === 'truncated' ? raw.subarray(0, -1) : Buffer.from(raw);
      if (kind === 'changed') altered[0] ^= 1;
      writeFileSync(file, altered);
      writeFileSync(pin, expectedText);
      const message = kind === 'truncated' ? /Source mismatch: bytes/ : /Source mismatch: sha256/;
      await expect(inspectSource(file, metadata, expected)).rejects.toThrow(message);
      expect(expected).toEqual(JSON.parse(expectedText));
      const result = cli(file, '--expected', pin);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toMatch(message);
      expect(result.stderr).toContain('File not adopted');
      expect(readFileSync(pin, 'utf8')).toBe(expectedText);
      expect(readFileSync(file)).toEqual(altered);
    },
  );

  it('W18: rejects malformed schema fields and mismatched provenance instead of accepting a replacement manifest', async () => {
    const schema = JSON.parse(readFileSync('content/schemas/source-manifest.schema.json', 'utf8'));
    expect(schema.required).toEqual(Object.keys(expected));
    expect(schema.additionalProperties).toBe(false);
    expect(() => validateManifest(expected)).not.toThrow();
    for (const key of schema.required) {
      const missing = { ...expected };
      delete missing[key];
      expect(() => validateManifest(missing)).toThrow(key);
    }
    for (const [key, value] of [
      ['schema_version', 2],
      ['source_id', ''],
      ['url', 'file:///tmp/source'],
      ['url', 'https://user:password@example.org/data'],
      ['retrieved_at', '2026-02-30T00:00:00Z'],
      ['retrieved_at', '2026-10-03'],
      ['bytes', -1],
      ['bytes', 1.5],
      ['bytes', Number.MAX_SAFE_INTEGER + 1],
      ['sha256', 'bad'],
      ['format', ' '],
      ['version', null],
      ['lineage', ['Wiktionary', 'Wiktionary']],
      ['lineage', [null]],
      ['ai_reviewed', true],
    ])
      expect(() => validateManifest({ ...expected, [key]: value })).toThrow(key);
    for (const key of ['source_id', 'url', 'retrieved_at', 'format', 'version', 'lineage']) {
      const changed = {
        ...metadata,
        [key]: key === 'lineage' ? ['unrelated source'] : `${metadata[key]}x`,
      };
      await expect(inspectSource(source, changed, expected)).rejects.toThrow();
    }
  });

  it('F08: bad CLI inputs and unreadable local files fail without a report', () => {
    const path = workspace();
    const bad = join(path, 'invalid.json');
    writeFileSync(bad, '{');
    for (const result of [
      cli(source, '--expected', bad),
      cli(join(path, 'missing.tsv'), '--expected', `${dir}manifest.json`),
      cli(source, '--download', `${dir}metadata.json`),
      cli(source, '--expected', `${dir}metadata.json`),
    ]) {
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr.length).toBeGreaterThan(0);
    }
  });
});
