// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { afterEach, expect, it } from 'vitest';
import { inspectSource } from './inspect-source.mjs';
import {
  headers,
  importWorkbook,
  lookup,
  parseFields,
  run,
  reportWorkbooks,
} from './import-subtlex.mjs';

const dir = 'tests/fixtures/content-sources/';
const file = `${dir}subtlex-excerpt.xlsx`;
const pin = JSON.parse(readFileSync(`${dir}subtlex-excerpt.manifest.json`, 'utf8'));
const records = JSON.parse(readFileSync(`${dir}subtlex-records.json`, 'utf8'));
const fields = records.pinnen.data;
const query = { surface: 'pinnen', lemma: 'pinnen', pos: 'verb' };
const directories = [];
afterEach(() => directories.splice(0).forEach((p) => rmSync(p, { recursive: true, force: true })));
async function workbook(rows, columns = headers) {
  const path = mkdtempSync(join(tmpdir(), 'subtlex-test-'));
  directories.push(path);
  const target = join(path, 'excerpt.xlsx');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('SUBTLEX-NL');
  ws.addRow(columns);
  for (const row of rows) ws.addRow(row);
  await wb.xlsx.writeFile(target);
  const metadata = Object.fromEntries(
    Object.entries(pin).filter(([key]) => !['schema_version', 'bytes', 'sha256'].includes(key)),
  );
  const expected = await inspectSource(target, metadata);
  return { target, expected };
}
function observation(data, row = 2) {
  return { worksheet_row: row, record_sha256: 'synthetic-test-observation', data };
}

it.each([
  ['full', file, pin, 19813],
  [
    'cd2',
    `${dir}subtlex-cd2-excerpt.xlsx`,
    JSON.parse(readFileSync(`${dir}subtlex-cd2-excerpt.manifest.json`, 'utf8')),
    19887,
  ],
])(
  'W18: AC1 streams the direct %s excerpt, counts every row and preserves typed values and quoted POS/count lists',
  async (kind, excerpt, excerptPin, originalRow) => {
    expect(records).toEqual(
      JSON.parse(
        readFileSync('research/content-2026-10/evidence/pilot-frequency-supplement.json', 'utf8'),
      ),
    );
    const pilot = JSON.parse(
      readFileSync('research/content-2026-10/content/starter-pack.json', 'utf8'),
    );
    const source = pilot.entries.flatMap((e) => e.sources).find((s) => s.id === 'subtlex:pinnen');
    expect(source.record_sha256).toBe(
      'f386cd00e9fef1ad5e200f5fff2f0385edbc8adebedd9d21b0afabf7e0ba85b9',
    );
    const provenance = JSON.parse(readFileSync(`${dir}subtlex-excerpt.records.json`, 'utf8'))[kind];
    const production = JSON.parse(readFileSync(`tools/content/pins/subtlex-${kind}.json`, 'utf8'));
    expect(excerptPin.lineage).toContain(production.sha256);
    expect(provenance).toEqual({
      source_sha256: production.sha256,
      excerpt_worksheet_row: 2,
      source_worksheet_row: originalRow,
      record_sha256: source.record_sha256,
    });
    const result = await importWorkbook(excerpt, excerptPin, [query], {
      expectedRows: 1,
      minimumCD: 2,
    });
    expect(result.rows).toBe(1);
    expect(result.minimum_cd).toBe(52);
    expect(result.rows_cd1).toBe(0);
    expect(result.manifest).toEqual(excerptPin);
    expect(result.observations).toEqual([
      {
        worksheet_row: 2,
        record_sha256: source.record_sha256,
        data: fields,
      },
    ]);
    expect(result.observations[0].data['all.pos']).toBe('.WW.N.SPEC.');
    expect(result.observations[0].data['all.pos.freq']).toBe('.54.2.1.');
    expect(result.observations[0].data['all.pos.lemma.freq']).toBe('.94.98.1.');
    expect(result.units.FREQcount).toBe('surface-form token count');
    expect(result.units.SUBTLEXWF).toBe('surface-form occurrences per million words');
    expect(result.units.SUBTLEXCD).toBe(
      'percentage of subtitle contexts containing the surface form',
    );
    const unselected = await importWorkbook(excerpt, excerptPin);
    expect(unselected.rows).toBe(1);
    expect(unselected.observations).toEqual([]);
    await expect(importWorkbook(excerpt, excerptPin, [], { expectedRows: 437503 })).rejects.toThrow(
      'row count mismatch',
    );
  },
);

it('W18: preserves cached numeric formula evidence and rejects absent or invalid caches', async () => {
  const values = headers.map((h) => fields[h]);
  const zipf = headers.indexOf('Zipf');
  values[zipf] = { formula: 'LOG10(1.3035) + 3', result: fields.Zipf };
  const { target, expected } = await workbook([values]);
  const result = await importWorkbook(target, expected, [query]);
  expect(result.observations[0].data).toEqual(fields);
  for (const invalid of [
    { formula: '1 + 1' },
    { formula: '1 + 1', result: '2' },
    { formula: '1 / 0', result: { error: '#DIV/0!' } },
  ]) {
    values[zipf] = invalid;
    expect(() => parseFields(values)).toThrow('numeric field: Zipf');
  }
});

it('F04: preserves numeric numeral lemmas without guessing a string lemma join', async () => {
  const numeral = { ...fields, Word: '1', 'dominant.pos.lemma': 1, 'dominant.pos': 'TW' };
  const numeralQuery = { surface: '1', lemma: '1', pos: 'verb' };
  const { target, expected } = await workbook([headers.map((h) => numeral[h])]);
  const result = await importWorkbook(target, expected, [numeralQuery]);
  expect(result.observations[0].data).toEqual(numeral);
  expect(lookup(result.observations, numeralQuery)).toMatchObject({
    join_status: 'lemma_mismatch',
    scoring_input: { surface_count: 57, lemma_count: null },
  });
  for (const invalid of [Infinity, NaN, true, { text: '1' }]) {
    expect(() =>
      parseFields(headers.map((h) => (h === 'dominant.pos.lemma' ? invalid : fields[h]))),
    ).toThrow('text field: dominant.pos.lemma');
  }
});

it.each([{ formula: '-ie' }, { formula: '-4-0-5-4-3-4', result: -20 }, { error: '#NAME?' }])(
  'F04: retains source lemma artifact %j without interpreting it as a scoring lemma',
  async (artifact) => {
    const data = { ...fields, 'dominant.pos.lemma': artifact };
    const values = headers.map((h) => data[h]);
    expect(parseFields(values)).toEqual(data);
    const { target, expected } = await workbook([values]);
    const imported = await importWorkbook(target, expected, [query]);
    expect(imported.observations[0].data).toEqual(data);
    expect(lookup(imported.observations, query)).toMatchObject({
      join_status: 'lemma_mismatch',
      scoring_input: { surface_count: 57, lemma_count: null },
    });
  },
);

it('W18: validates headers, typed fields, thresholds and completeness even in unselected rows', async () => {
  const values = headers.map((h) => fields[h]);
  for (const [rows, columns, options, error] of [
    [[values], [...headers].reverse(), {}, 'headers'],
    [[values, ['bad', '57', ...values.slice(2)]], headers, {}, 'numeric field'],
    [[['pinnen', 57, 1, ...values.slice(3)]], headers, { minimumCD: 2 }, 'threshold'],
    [[], headers, {}, 'Empty'],
    [[values], headers, { expectedRows: 2 }, 'row count mismatch'],
  ]) {
    const { target, expected } = await workbook(rows, columns);
    await expect(importWorkbook(target, expected, [], options)).rejects.toThrow(error);
  }
  for (const invalid of [NaN, Infinity, -1, 1.5, '57']) {
    expect(() => parseFields(['pinnen', invalid, ...values.slice(2)])).toThrow('numeric field');
  }
  expect(() => parseFields(values.slice(0, -1))).toThrow('column count');
  expect(() => parseFields([42, ...values.slice(1)])).toThrow('text field');
  expect(() => parseFields(['', ...values.slice(1)])).toThrow('Missing');
  const path = mkdtempSync(join(tmpdir(), 'subtlex-corrupt-'));
  directories.push(path);
  const corrupt = join(path, 'bad.xlsx');
  writeFileSync(corrupt, readFileSync(file).subarray(0, -100));
  await expect(importWorkbook(corrupt, pin)).rejects.toThrow('Source mismatch');
  const metadata = Object.fromEntries(
    Object.entries(pin).filter(([key]) => !['schema_version', 'bytes', 'sha256'].includes(key)),
  );
  const corruptPin = await inspectSource(corrupt, metadata);
  await expect(importWorkbook(corrupt, corruptPin)).rejects.toThrow();
});

it('F04: AC2 inflected rows never sum repeated FREQlemma or matching dominant lemma/POS totals', async () => {
  // Deliberately synthetic inflections exercise repeated totals independently of the research excerpt.
  const inflected = { ...fields, Word: 'pinde', FREQcount: 10, CDcount: 3 };
  const { target, expected } = await workbook(
    [fields, inflected].map((r) => headers.map((h) => r[h])),
  );
  const result = await importWorkbook(target, expected, [query], { expectedRows: 2 });
  const match = lookup(result.observations, query);
  expect(match.lemma_evidence.observations).toHaveLength(2);
  expect(match.lemma_evidence.count).toBe(94);
  expect(match.scoring_input.lemma_count).toBe(94);
  expect(match.scoring_input.surface_count).toBe(57);
  expect(match.surface_evidence[0].data.FREQlemma).toBe(193);
  expect(match.join_status).toBe('matched');
  expect(match.pos_ambiguous).toBe(true);
  const inflectedQuery = lookup(result.observations, { ...query, surface: 'pinde' });
  expect(inflectedQuery.scoring_input.lemma_count).toBe(94);
  expect(inflectedQuery.scoring_input.surface_count).toBe(10);
  const conflict = lookup(
    [...result.observations, observation({ ...inflected, 'dominant.pos.lemma.freq': 95 })],
    query,
  );
  expect(conflict.join_status).toBe('conflicting_lemma_totals');
  expect(conflict.scoring_input.lemma_count).toBeNull();
  expect(conflict.lemma_evidence.count).toBeNull();
});

it.each([
  [{ 'dominant.pos.lemma': null }, 'missing_dominant_lemma_or_pos'],
  [{ 'dominant.pos': null }, 'missing_dominant_lemma_or_pos'],
  [{ 'dominant.pos.lemma': 'pin' }, 'lemma_mismatch'],
  [{ 'dominant.pos': 'N' }, 'pos_mismatch'],
  [{ 'dominant.pos.lemma.freq': null }, 'missing_lemma_count'],
])('F04: AC3 %j leaves scoring lemma unknown and preserves surface evidence', (change, status) => {
  const row = observation({ ...fields, ...change });
  const result = lookup([row], query);
  expect(result.join_status).toBe(status);
  expect(result.scoring_input).toMatchObject({
    surface_count: 57,
    contextual_diversity: 52,
    surface_zipf: fields.Zipf,
    lemma_count: null,
    lemma_pos: null,
  });
  expect(result.surface_evidence).toEqual([row]);
});

it('F08: reports unmatched, unmapped and POS-ambiguous joins with all observations', () => {
  const verb = observation(fields);
  const noun = observation({
    ...fields,
    Word: 'pin',
    'dominant.pos': 'N',
    'dominant.pos.lemma.freq': 98,
  });
  const mismatch = lookup([verb, noun], { ...query, pos: 'noun' });
  expect(mismatch.join_status).toBe('pos_mismatch');
  expect(mismatch.lemma_evidence.count).toBe(98);
  expect(mismatch.scoring_input.lemma_count).toBeNull();
  expect(mismatch.lemma_evidence.other_pos_observations).toEqual([verb]);
  expect(lookup([verb], { ...query, surface: 'absent' })).toMatchObject({
    join_status: 'unmatched_surface',
    scoring_input: { surface_count: null, lemma_count: null },
  });
  expect(lookup([verb], { ...query, pos: 'unknown' })).toMatchObject({
    join_status: 'unmapped_pos',
    scoring_input: { surface_count: 57, lemma_count: null },
  });
  expect(lookup([verb, verb], query)).toMatchObject({
    join_status: 'ambiguous_surface',
    surface_evidence: [verb, verb],
    scoring_input: { surface_count: null, lemma_count: null },
  });
});

it('W18: production pins retain research byte identities and failed CLI import emits no partial report', async () => {
  for (const kind of ['full', 'cd2']) {
    const production = JSON.parse(readFileSync(`tools/content/pins/subtlex-${kind}.json`, 'utf8'));
    const research = JSON.parse(
      readFileSync(
        `research/content-2026-10/evidence/sources/subtlex-${kind}.xlsx.manifest.json`,
        'utf8',
      ),
    );
    for (const key of ['url', 'retrieved_at', 'bytes', 'sha256'])
      expect(production[key]).toBe(research[key]);
  }
  const result = spawnSync('npm', ['--silent', 'run', 'content:subtlex', '--', file, file], {
    encoding: 'utf8',
  });
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
  expect(result.stderr).toContain('Source mismatch');
  await expect(run([])).rejects.toThrow('Usage');
  await expect(importWorkbook(file, pin, [{}])).rejects.toThrow('Queries');
});

it('F08: CLI report builder includes both file summaries, lookup evidence and rejected joins', async () => {
  const missing = { ...query, surface: 'absent' };
  const result = await reportWorkbooks(
    [
      { file, pin, expectedRows: 1, minimumCD: 1 },
      { file, pin, expectedRows: 1, minimumCD: 2 },
    ],
    [query, missing],
  );
  expect(result.importer).toBe('subtlex-nl-v1');
  expect(result.files).toHaveLength(2);
  for (const summary of result.files) {
    expect(summary.rows).toBe(1);
    expect(summary.manifest).toEqual(pin);
    expect(summary.lookups[0].scoring_input.lemma_count).toBe(94);
    expect(summary.lookups[0].surface_evidence[0].data).toEqual(fields);
    expect(summary.unmatched_or_ambiguous_joins).toEqual(summary.lookups);
    expect(summary.lookups[0].pos_ambiguous).toBe(true);
    expect(summary.lookups[1].join_status).toBe('unmatched_surface');
  }
  await expect(
    reportWorkbooks(
      [
        { file, pin, expectedRows: 1, minimumCD: 1 },
        { file, pin, expectedRows: 150357, minimumCD: 2 },
      ],
      [query],
    ),
  ).rejects.toThrow('row count mismatch');
});
