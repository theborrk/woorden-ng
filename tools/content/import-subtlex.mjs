import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { inspectSource } from './inspect-source.mjs';

export const headers = [
  'Word',
  'FREQcount',
  'CDcount',
  'FREQlow',
  'CDlow',
  'FREQlemma',
  'SUBTLEXWF',
  'Zipf',
  'SUBTLEXCD',
  'Lg10CD',
  'dominant.pos',
  'dominant.pos.freq',
  'dominant.pos.lemma',
  'dominant.pos.lemma.freq',
  'all.pos',
  'all.pos.freq',
  'all.pos.lemma.freq',
];
const counts = new Set([
  'FREQcount',
  'CDcount',
  'FREQlow',
  'CDlow',
  'FREQlemma',
  'dominant.pos.freq',
  'dominant.pos.lemma.freq',
]);
const decimals = new Set(['SUBTLEXWF', 'Zipf', 'SUBTLEXCD', 'Lg10CD']);
export const units = Object.freeze({
  FREQcount: 'surface-form token count',
  CDcount: 'subtitle contexts containing the surface form',
  FREQlow: 'lowercase surface-form token count',
  CDlow: 'subtitle contexts containing the lowercase surface form',
  FREQlemma: 'lemma token count (repeated across inflected rows; not additive)',
  SUBTLEXWF: 'surface-form occurrences per million words',
  Zipf: 'surface-form Zipf scale',
  SUBTLEXCD: 'percentage of subtitle contexts containing the surface form',
  Lg10CD: 'log10(CDcount + 1)',
  'dominant.pos.freq': 'surface-form token count for dominant POS',
  'dominant.pos.lemma.freq': 'token count for dominant lemma/POS (not sense frequency)',
  'all.pos': 'verbatim dot-delimited POS labels',
  'all.pos.freq': 'verbatim dot-delimited surface/POS token counts',
  'all.pos.lemma.freq': 'verbatim dot-delimited lemma/POS token counts',
});

/** @typedef {Record<string, string | number | null | {formula: string, result?: number} | {error: string}>} SubtlexFields */
/** @typedef {{worksheet_row: number, record_sha256: string, data: SubtlexFields}} Observation */
/** @typedef {{surface: string, lemma: string, pos: string}} Query */

export function parseFields(values) {
  if (values.length !== headers.length) throw new Error('Invalid SUBTLEX column count.');
  const data = {};
  for (const [i, name] of headers.entries()) {
    const cell = values[i] ?? null;
    // The full pinned workbook stores Zipf as formulas. Read the cached source
    // result without evaluating formulas; absent/non-numeric caches still fail.
    const value =
      (counts.has(name) || decimals.has(name)) && cell !== null && typeof cell === 'object'
        ? cell.result
        : cell;
    if (counts.has(name) || decimals.has(name)) {
      if (
        value !== null &&
        (typeof value !== 'number' ||
          !Number.isFinite(value) ||
          (counts.has(name) && (!Number.isSafeInteger(value) || value < 0)))
      ) {
        throw new Error(`Invalid SUBTLEX numeric field: ${name}.`);
      }
    } else if (
      value !== null &&
      typeof value !== 'string' &&
      // Numeral lemmas (for example surface "1") are numeric cells in the
      // pinned source. Preserve their type; string lemma queries do not join them.
      !(
        name === 'dominant.pos.lemma' &&
        ((typeof value === 'number' && Number.isFinite(value)) || isLemmaArtifact(value))
      )
    ) {
      throw new Error(`Invalid SUBTLEX text field: ${name}.`);
    }
    data[name] = value;
  }
  if (!data.Word || data.FREQcount === null || data.CDcount === null)
    throw new Error('Missing SUBTLEX Word/FREQcount/CDcount.');
  return data;
}

function isLemmaArtifact(value) {
  if (!value || typeof value !== 'object') return false;
  // Some leading-hyphen lemmas were saved as Excel formulas/errors upstream.
  // Retain those source artifacts verbatim, without guessing a usable lemma.
  return (
    (typeof value.formula === 'string' &&
      Object.keys(value).every((k) => ['formula', 'result'].includes(k)) &&
      (value.result === undefined ||
        (typeof value.result === 'number' && Number.isFinite(value.result)))) ||
    (typeof value.error === 'string' && Object.keys(value).length === 1)
  );
}

function metadataFrom(pin) {
  return Object.fromEntries(
    Object.entries(pin).filter(([key]) => !['schema_version', 'bytes', 'sha256'].includes(key)),
  );
}

// ExcelJS's sequential ZIP reader can accept a missing central directory. Require
// the archive terminator too, so a newly pinned truncated file cannot pass parsing.
async function validateZipEnd(file) {
  const handle = await open(file, 'r');
  try {
    const { size } = await handle.stat();
    const tail = Buffer.alloc(Math.min(size, 65557));
    await handle.read(tail, 0, tail.length, size - tail.length);
    for (let i = tail.length - 22; i >= 0; i--) {
      if (tail.readUInt32LE(i) === 0x06054b50 && i + 22 + tail.readUInt16LE(i + 20) === tail.length)
        return;
    }
    throw new Error('Incomplete XLSX ZIP archive.');
  } finally {
    await handle.close();
  }
}

/** Stream and validate every row; retain only requested surface/lemma observations. */
export async function importWorkbook(
  file,
  pin,
  queries = [],
  { expectedRows, minimumCD = 1 } = {},
) {
  validateQueries(queries);
  const manifest = await inspectSource(file, metadataFrom(pin), pin);
  await validateZipEnd(file);
  const wantedSurfaces = new Set(queries.map((q) => q.surface));
  const wantedLemmas = new Set(queries.map((q) => q.lemma));
  const observations = [];
  let rows = 0;
  let worksheets = 0;
  let rowsCD1 = 0;
  let minCD = Infinity;
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(file, {
    sharedStrings: 'cache',
    styles: 'ignore',
    hyperlinks: 'ignore',
    worksheets: 'emit',
  });
  for await (const worksheet of reader) {
    worksheets++;
    if (worksheets !== 1) throw new Error('Expected one SUBTLEX worksheet.');
    let headerSeen = false;
    for await (const row of worksheet) {
      // ExcelJS uses a sparse, one-based values array. Preserve empty cells as null.
      const values = Array.from(
        { length: Math.max(headers.length, row.cellCount) },
        (_, i) => row.getCell(i + 1).value,
      );
      if (!headerSeen) {
        if (JSON.stringify(values) !== JSON.stringify(headers))
          throw new Error('Invalid SUBTLEX headers.');
        headerSeen = true;
        continue;
      }
      const data = parseFields(values);
      if (data.CDcount < minimumCD)
        throw new Error('SUBTLEX contextual diversity below file threshold.');
      rows++;
      minCD = Math.min(minCD, data.CDcount);
      if (data.CDcount === 1) rowsCD1++;
      if (wantedSurfaces.has(data.Word) || wantedLemmas.has(data['dominant.pos.lemma'])) {
        observations.push({
          worksheet_row: row.number,
          record_sha256: createHash('sha256')
            .update(
              JSON.stringify(
                Object.fromEntries(
                  Object.keys(data)
                    .sort()
                    .map((key) => [key, data[key]]),
                ),
              ),
            )
            .digest('hex'),
          data,
        });
      }
    }
    if (!headerSeen) throw new Error('Missing SUBTLEX headers.');
  }
  if (worksheets !== 1 || rows === 0) throw new Error('Empty SUBTLEX workbook.');
  if (expectedRows !== undefined && rows !== expectedRows)
    throw new Error(`SUBTLEX row count mismatch: expected ${expectedRows}, loaded ${rows}.`);
  return { manifest, rows, rows_cd1: rowsCD1, minimum_cd: minCD, units, observations };
}

const posMap = Object.freeze({
  noun: 'N',
  verb: 'WW',
  adj: 'ADJ',
  adjective: 'ADJ',
  adv: 'BW',
  adverb: 'BW',
  pron: 'VNW',
  det: 'VNW',
  conj: 'VG',
});

function validateQueries(queries) {
  if (
    !Array.isArray(queries) ||
    queries.some(
      (q) =>
        !q ||
        typeof q !== 'object' ||
        ['surface', 'lemma', 'pos'].some((k) => typeof q[k] !== 'string' || !q[k].trim()),
    )
  ) {
    throw new Error('Queries must be an array of {surface, lemma, pos} strings.');
  }
}

/** @param {Observation[]} observations @param {Query} query */
export function lookup(observations, query) {
  validateQueries([query]);
  const pos = posMap[query.pos] ?? null;
  const surface = observations.filter((r) => r.data.Word === query.surface);
  const lemmaRows = observations.filter((r) => r.data['dominant.pos.lemma'] === query.lemma);
  const compatible = lemmaRows.filter((r) => pos !== null && r.data['dominant.pos'] === pos);
  const totals = [...new Set(compatible.map((r) => r.data['dominant.pos.lemma.freq']))];
  // A lemma total is an observation, not an inflection subtotal. Conflicts stay unknown.
  const lemmaCount = totals.length === 1 ? totals[0] : null;
  let status = 'matched';
  if (surface.length === 0) status = 'unmatched_surface';
  else if (surface.length !== 1) status = 'ambiguous_surface';
  else if (pos === null) status = 'unmapped_pos';
  else if (!surface[0].data['dominant.pos.lemma'] || !surface[0].data['dominant.pos'])
    status = 'missing_dominant_lemma_or_pos';
  else if (surface[0].data['dominant.pos.lemma'] !== query.lemma) status = 'lemma_mismatch';
  else if (surface[0].data['dominant.pos'] !== pos) status = 'pos_mismatch';
  else if (totals.length > 1) status = 'conflicting_lemma_totals';
  else if (lemmaCount === null) status = 'missing_lemma_count';
  const scoringCount = status === 'matched' ? lemmaCount : null;
  return {
    query,
    mapped_pos: pos,
    join_status: status,
    pos_ambiguous:
      surface.some(
        (r) =>
          typeof r.data['all.pos'] === 'string' &&
          new Set(r.data['all.pos'].split('.').filter(Boolean)).size > 1,
      ) || lemmaRows.some((r) => r.data['dominant.pos'] !== pos),
    surface_evidence: surface,
    lemma_evidence: {
      count: lemmaCount,
      pos,
      observations: compatible,
      other_pos_observations: lemmaRows.filter((r) => !compatible.includes(r)),
      method: 'unique matching dominant lemma/POS total; never summed',
    },
    scoring_input: {
      surface_count: surface.length === 1 ? surface[0].data.FREQcount : null,
      contextual_diversity: surface.length === 1 ? surface[0].data.CDcount : null,
      surface_zipf: surface.length === 1 ? surface[0].data.Zipf : null,
      lemma_count: scoringCount,
      lemma_pos: scoringCount === null ? null : pos,
      scope: 'surface and lemma/POS evidence; no sense-frequency inference',
    },
  };
}

export async function reportWorkbooks(inputs, queries = []) {
  const files = [];
  for (const { file, pin, expectedRows, minimumCD } of inputs) {
    const imported = await importWorkbook(file, pin, queries, { expectedRows, minimumCD });
    const { observations, ...summary } = imported;
    const lookups = queries.map((q) => lookup(observations, q));
    files.push({
      ...summary,
      lookups,
      unmatched_or_ambiguous_joins: lookups.filter(
        (q) => q.join_status !== 'matched' || q.pos_ambiguous,
      ),
    });
  }
  return { importer: 'subtlex-nl-v1', files };
}

export async function run(args = process.argv.slice(2)) {
  if (![2, 4].includes(args.length) || (args.length === 4 && args[2] !== '--queries'))
    throw new Error(
      'Usage: npm run content:subtlex -- <full.xlsx> <cd2.xlsx> [--queries <queries.json>]',
    );
  const queries = args.length === 4 ? JSON.parse(readFileSync(args[3], 'utf8')) : [];
  validateQueries(queries);
  const inputs = ['full', 'cd2'].map((kind, i) => ({
    file: args[i],
    pin: JSON.parse(readFileSync(new URL(`./pins/subtlex-${kind}.json`, import.meta.url), 'utf8')),
    expectedRows: kind === 'full' ? 437503 : 150357,
    minimumCD: kind === 'full' ? 1 : 2,
  }));
  console.log(JSON.stringify(await reportWorkbooks(inputs, queries), null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
