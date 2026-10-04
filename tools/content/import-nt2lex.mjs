import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectSource, validateManifest } from './inspect-source.mjs';

export const bands = ['A1', 'A2', 'B1', 'B2', 'C1', 'TOTAL'];
export const metrics = ['D', 'F', 'SFI', 'U', 'tf-idf'];
const extractor = 'woorden-nt2lex/1';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pinPath = (variant) => new URL(`./sources/nt2lex-${variant}.json`, import.meta.url);

// Keep source observations separate from editorial estimates and curriculum stages.
export function displayExposure(row) {
  return {
    lemma: row.lemma,
    pos: row.pos,
    label: 'NT2Lex source exposure (not certified CEFR proficiency)',
    distributions: row.distributions,
    crosswalk: row.crosswalk,
    provenance: row.provenance,
  };
}

export function parseNt2lex(bytes, variant, source) {
  validateManifest(source);
  if (!['basic', 'senses'].includes(variant)) throw new Error('Unknown NT2Lex variant.');
  if (source.bytes !== bytes.length || source.sha256 !== sha256(bytes)) {
    throw new Error('NT2Lex bytes differ from the inspected manifest. File not adopted.');
  }
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const header = [
    'word',
    'tag',
    ...(variant === 'senses' ? ['sense_se-id', 'sense_sy-id'] : []),
    ...bands.flatMap((band) => metrics.map((metric) => `${metric}@${band}`)),
  ];
  const content = (line) => line.replace(/\r?\n$/, '');
  if (content(lines[0] ?? '') !== header.join('\t')) {
    throw new Error(`Invalid NT2Lex ${variant} header.`);
  }
  return lines.slice(1).map((raw, index) => {
    const line = index + 2;
    const values = content(raw).split('\t');
    if (values.length !== header.length || !values[0] || !values[1]) {
      throw new Error(`Invalid NT2Lex record at line ${line}.`);
    }
    const fields = Object.fromEntries(header.map((key, i) => [key, values[i]]));
    const distributions = Object.fromEntries(
      bands.map((band) => [
        band,
        Object.fromEntries(
          metrics.map((metric) => {
            const value = fields[`${metric}@${band}`];
            if (value === '-') return [metric, null];
            if (
              !/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value) ||
              !Number.isFinite(Number(value))
            ) {
              throw new Error(`Invalid ${metric}@${band} at line ${line}.`);
            }
            return [metric, Number(value)];
          }),
        ),
      ]),
    );
    const lexicalEntryId =
      variant === 'senses' && fields['sense_se-id'] !== '-' ? fields['sense_se-id'] : null;
    const synsetId =
      variant === 'senses' && fields['sense_sy-id'] !== '-' ? fields['sense_sy-id'] : null;
    return {
      lemma: fields.word,
      pos: fields.tag,
      distributions,
      source_fields: fields,
      crosswalk:
        lexicalEntryId === null
          ? null
          : {
              status: 'candidate',
              source_field: 'sense_se-id',
              target_source: 'ODWN',
              target_field: 'LexicalEntry.id',
              target_id: lexicalEntryId,
            },
      source_synset_id: synsetId,
      provenance: {
        source_id: source.source_id,
        source_sha256: source.sha256,
        source_line: line,
        record_sha256: sha256(Buffer.from(raw, 'utf8')),
        extractor,
        variant,
      },
    };
  });
}

export async function importNt2lex(file, variant, expected) {
  validateManifest(expected);
  const metadata = Object.fromEntries(
    Object.entries(expected).filter(
      ([key]) => !['schema_version', 'bytes', 'sha256'].includes(key),
    ),
  );
  const source = await inspectSource(file, metadata, expected);
  const rows = parseNt2lex(readFileSync(file), variant, source);
  return { source, rows };
}

export function importReport({ source, rows }) {
  return {
    source,
    extractor,
    rows: rows.length,
    rows_by_pos: Object.fromEntries(
      [...new Set(rows.map((row) => row.pos))]
        .sort()
        .map((pos) => [pos, rows.filter((row) => row.pos === pos).length]),
    ),
    candidate_lexical_entry_links: rows.filter((row) => row.crosswalk !== null).length,
    missing_lexical_entry_links: rows.filter((row) => row.crosswalk === null).length,
    missing_synset_ids: rows.filter((row) => row.source_synset_id === null).length,
    missing_values: Object.fromEntries(
      bands.map((band) => [
        band,
        Object.fromEntries(
          metrics.map((metric) => [
            metric,
            rows.filter((row) => row.distributions[band][metric] === null).length,
          ]),
        ),
      ]),
    ),
  };
}

export async function run(args = process.argv.slice(2)) {
  const allowed = [
    '--basic',
    '--senses',
    '--basic-manifest',
    '--senses-manifest',
    '--output',
    '--lemma',
    '--pos',
  ];
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!allowed.includes(args[i]) || !args[i + 1] || Object.hasOwn(options, args[i]))
      throw new Error('Invalid NT2Lex arguments.');
    options[args[i]] = args[i + 1];
  }
  if (!options['--basic'] || !options['--senses'] || (options['--pos'] && !options['--lemma'])) {
    throw new Error(
      'Usage: npm run content:nt2lex -- --basic <local.tsv> --senses <local.tsv> [--output <new.json>] [--lemma <word> --pos <tag>] [--basic-manifest <pin.json> --senses-manifest <pin.json>]',
    );
  }
  const imported = {};
  for (const variant of ['basic', 'senses']) {
    const expected = JSON.parse(
      readFileSync(options[`--${variant}-manifest`] ?? pinPath(variant), 'utf8'),
    );
    imported[variant] = await importNt2lex(options[`--${variant}`], variant, expected);
  }
  const report = {
    interpretation:
      'NT2Lex source exposure; candidate ODWN links; no certified CEFR proficiency or language review inferred.',
    basic: importReport(imported.basic),
    senses: importReport(imported.senses),
  };
  if (options['--lemma']) {
    report.entries = Object.values(imported).flatMap(({ rows }) =>
      rows
        .filter(
          (row) =>
            row.lemma === options['--lemma'] && (!options['--pos'] || row.pos === options['--pos']),
        )
        .map(displayExposure),
    );
  }
  // Both pins and every row must pass before writing; never overwrite an existing artifact.
  if (options['--output'])
    writeFileSync(options['--output'], `${JSON.stringify(imported, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
