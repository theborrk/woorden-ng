// @vitest-environment node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import {
  bands,
  displayExposure,
  importNt2lex,
  importReport,
  metrics,
  parseNt2lex,
} from './import-nt2lex.mjs';

const root = 'tests/fixtures/content-sources';
const fixture = (variant) => `${root}/nt2lex-${variant}.tsv`;
const pin = (variant) =>
  JSON.parse(readFileSync(`${root}/nt2lex-${variant}.manifest.json`, 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const dirs = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));
function workspace() {
  const dir = mkdtempSync(join(tmpdir(), 'nt2lex-'));
  dirs.push(dir);
  return dir;
}
function cli(...extra) {
  return spawnSync(
    process.execPath,
    [
      'tools/content/import-nt2lex.mjs',
      '--basic',
      fixture('basic'),
      '--senses',
      fixture('senses'),
      '--basic-manifest',
      `${root}/nt2lex-basic.manifest.json`,
      '--senses-manifest',
      `${root}/nt2lex-senses.manifest.json`,
      ...extra,
    ],
    { encoding: 'utf8' },
  );
}

it('W18: AC1 imports every pinned excerpt row, POS and A1–C1/TOTAL metric without merging', async () => {
  for (const [variant, count] of [
    ['basic', 4],
    ['senses', 9],
  ]) {
    const imported = await importNt2lex(fixture(variant), variant, pin(variant));
    expect(imported.rows).toHaveLength(count);
    const [missing, attested] = imported.rows;
    expect(missing.lemma).toBe("'s avond");
    expect(attested.lemma).toBe(missing.lemma);
    expect(missing.pos).toBe('BW() N(soort)');
    expect(attested.pos).toBe('LID(bep) N(soort)');
    expect(missing.distributions.A1).toEqual({
      D: null,
      F: null,
      SFI: null,
      U: null,
      'tf-idf': null,
    });
    expect(attested.distributions.A1).toEqual({
      D: 0,
      F: 1,
      SFI: 41.22181202741922,
      U: 1.3248942117705695,
      'tf-idf': 0.22314355131420976,
    });
    expect(attested.source_fields['D@A1']).toBe('0.0');
    const lines = readFileSync(fixture(variant), 'utf8').trimEnd().split('\n');
    const columns = lines[0].split('\t');
    for (const [i, row] of imported.rows.entries()) {
      const cells = lines[i + 1].split('\t');
      expect(Object.values(row.source_fields)).toEqual(cells);
      expect(Object.keys(row.distributions)).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'TOTAL']);
      for (const band of bands)
        for (const metric of metrics) {
          const original = cells[columns.indexOf(`${metric}@${band}`)];
          expect(row.distributions[band][metric]).toBe(original === '-' ? null : Number(original));
        }
    }
    const report = importReport(imported);
    expect(Object.values(report.rows_by_pos).reduce((sum, n) => sum + n, 0)).toBe(count);
    expect(report.missing_values.A1.F).toBe(variant === 'basic' ? 2 : 3);
  }
});

it('W18: AC1 retains original record hashes, source identity and physical line locators', async () => {
  for (const variant of ['basic', 'senses']) {
    const { source, rows } = await importNt2lex(fixture(variant), variant, pin(variant));
    const records = JSON.parse(readFileSync(`${root}/nt2lex-${variant}.records.json`, 'utf8'));
    for (const [i, row] of rows.entries()) {
      expect(row.provenance).toEqual({
        source_id: source.source_id,
        source_sha256: source.sha256,
        source_line: i + 2,
        record_sha256: records[i + 1].sha256,
        extractor: 'woorden-nt2lex/1',
        variant,
      });
    }
    expect(records.at(-1).source_line).toBe(variant === 'basic' ? 974 : 1124);
    expect(source.lineage).toContain(
      `sha256:${JSON.parse(readFileSync(`tools/content/sources/nt2lex-${variant}.json`, 'utf8')).sha256}`,
    );
  }
});

it('W18: AC2 candidate sense_se-id crosswalk targets ODWN LexicalEntry.id, never Sense.id or synset', async () => {
  const { rows } = await importNt2lex(fixture('senses'), 'senses', pin('senses'));
  const bank = rows.filter((row) => row.lemma === 'bank');
  expect(bank).toHaveLength(6);
  expect(bank.map((row) => row.crosswalk.target_id)).toEqual([
    'bank-n-1',
    'bank-n-2',
    'bank-n-3',
    'bank-n-5',
    'bank-n-6',
    'bank-n-7',
  ]);
  expect(bank[0].crosswalk).toEqual({
    status: 'candidate',
    source_field: 'sense_se-id',
    target_source: 'ODWN',
    target_field: 'LexicalEntry.id',
    target_id: 'bank-n-1',
  });
  expect(bank[0].source_synset_id).toBe('eng-30-02828884-n');
  for (const row of bank) {
    expect(row.crosswalk.target_field).not.toBe('Sense.id');
    expect(row.crosswalk.target_id).not.toBe(row.source_synset_id);
  }
  expect(rows[0].crosswalk).toBeNull();
  expect(rows[0].source_synset_id).toBeNull();
  const basic = await importNt2lex(fixture('basic'), 'basic', pin('basic'));
  expect(basic.rows.every((row) => row.crosswalk === null)).toBe(true);
});

it('F04: AC3 A1 attestation displays source exposure without assigning proficiency', async () => {
  const { rows } = await importNt2lex(fixture('senses'), 'senses', pin('senses'));
  const entry = displayExposure(rows.find((row) => row.lemma === 'bank'));
  expect(entry.label).toBe('NT2Lex source exposure (not certified CEFR proficiency)');
  expect(entry.distributions.A1.F).toBe(4);
  expect(entry.crosswalk.status).toBe('candidate');
  expect(entry).not.toHaveProperty('cefr');
  expect(entry).not.toHaveProperty('proficiency');
  expect(entry).not.toHaveProperty('review');
  const result = cli('--lemma', 'bank', '--pos', 'N(soort)');
  expect(result.status).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.entries).toHaveLength(7);
  expect(report.entries.every((row) => row.label === entry.label)).toBe(true);
  expect(report.basic.rows).toBe(4);
  expect(report.senses.rows).toBe(9);
  expect(report.senses.candidate_lexical_entry_links).toBe(6);
});

it('W18: changed or truncated bytes cannot produce an import or output artifact', async () => {
  const dir = workspace();
  const changed = join(dir, 'changed.tsv');
  for (const bytes of [
    readFileSync(fixture('senses')).subarray(0, 100),
    Buffer.from(readFileSync(fixture('senses'), 'utf8').replace('bank-n-1', 'bank-n-9')),
  ]) {
    writeFileSync(changed, bytes);
    await expect(importNt2lex(changed, 'senses', pin('senses'))).rejects.toThrow(/Source mismatch/);
    const output = join(dir, 'output.json');
    // Separate invocation avoids duplicate flags and checks a failed second input after a valid first.
    const result = spawnSync(
      process.execPath,
      [
        'tools/content/import-nt2lex.mjs',
        '--basic',
        fixture('basic'),
        '--senses',
        changed,
        '--basic-manifest',
        `${root}/nt2lex-basic.manifest.json`,
        '--senses-manifest',
        `${root}/nt2lex-senses.manifest.json`,
        '--output',
        output,
      ],
      { encoding: 'utf8' },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('File not adopted');
    expect(existsSync(output)).toBe(false);
  }
});

it('W18: invalid headers, row widths, UTF-8 and metric tokens fail rather than disappear', () => {
  const original = readFileSync(fixture('basic'));
  for (const bytes of [
    Buffer.from(original.toString().replace('word\ttag', 'lemma\tpos')),
    Buffer.from(original.toString().replace('0.0\t1\t', '\t1\t')),
    Buffer.from(original.toString().replace('0.0\t1\t', 'NaN\t1\t')),
    Buffer.concat([original, Buffer.from('\n')]),
    Buffer.from([0xff]),
  ]) {
    const expected = { ...pin('basic'), bytes: bytes.length, sha256: hash(bytes) };
    expect(() => parseNt2lex(bytes, 'basic', expected)).toThrow();
  }
});

it('W18: CLI writes all observations only after validation and refuses to overwrite', () => {
  const output = join(workspace(), 'observations.json');
  const result = cli('--output', output);
  expect(result.status).toBe(0);
  const bytes = readFileSync(output, 'utf8');
  const data = JSON.parse(bytes);
  expect(data.basic.rows).toHaveLength(4);
  expect(data.senses.rows).toHaveLength(9);
  expect(cli('--output', output).status).toBe(1);
  expect(readFileSync(output, 'utf8')).toBe(bytes);
  expect(cli('--pos', 'N(soort)').status).toBe(1);
});
