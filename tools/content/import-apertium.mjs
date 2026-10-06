import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SaxesParser } from 'saxes';
import { validateManifest } from './inspect-source.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const extractor = 'woorden-apertium/1';
const caveat =
  'Upstream lexical lineage may overlap; project agreement is not independent evidence or language approval.';

export function parseApertium(bytes, source) {
  validateManifest(source);
  if (bytes.length !== source.bytes || hash(bytes) !== source.sha256)
    throw new Error('Apertium source integrity check failed.');
  const xml = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const parser = new SaxesParser();
  const stack = [];
  const entries = [];
  let section;
  let ordinal = 0;
  let entry;
  parser.on('doctype', () => {
    throw new Error('Apertium external declarations are unsupported.');
  });
  parser.on('error', (error) => {
    throw error;
  });
  parser.on('opentag', ({ name, attributes }) => {
    if (!stack.length && name !== 'dictionary') throw new Error('Expected Apertium dictionary.');
    if (name === 'section' && stack.join('/') === 'dictionary') {
      section = attributes.id ?? null;
      ordinal = 0;
    }
    if (name === 'e' && stack.join('/') === 'dictionary/section') {
      ordinal += 1;
      entry = {
        lemma: attributes.lm ?? null,
        paradigms: [],
        start: xml.lastIndexOf('<e', parser.position - 1),
      };
    }
    if (entry && name === 'par') {
      if (!attributes.n) throw new Error('Apertium paradigm has no ID.');
      entry.paradigms.push(attributes.n);
    }
    stack.push(name);
  });
  parser.on('closetag', () => {
    if (stack.join('/') === 'dictionary/section/e') {
      const raw = xml.slice(entry.start, parser.position);
      const features = entry.paradigms.map((id) => ({
        paradigm_id: id,
        gender: /__n_(mf|m|f|nt)$/.exec(id)?.[1] ?? null,
        separable: /__vblex_sep$/.test(id) ? true : /__vblex$/.test(id) ? false : null,
      }));
      entries.push({
        lemma: entry.lemma,
        paradigms: entry.paradigms,
        features,
        raw_xml: raw,
        source: {
          source_id: source.source_id,
          source_sha256: source.sha256,
          section_id: section,
          section_entry: ordinal,
          record_sha256: hash(raw),
          extractor,
        },
      });
      entry = undefined;
    }
    stack.pop();
  });
  parser.write(xml).close();
  return {
    source,
    extractor,
    lineage_caveat: caveat,
    entries,
    report: {
      active_entries: entries.length,
      distinct_lemmas: new Set(entries.map((e) => e.lemma).filter(Boolean)).size,
    },
  };
}

// Inputs are selected, cited primary observations, not a vote or a replacement form inventory.
export function compareApertium(imported, primary) {
  if (!Array.isArray(primary)) throw new Error('Expected primary observation array.');
  return primary.map((record) => {
    if (
      !record ||
      typeof record.lemma !== 'string' ||
      !record.lemma ||
      !record.source?.source_id ||
      !/^[a-f0-9]{64}$/.test(record.source?.record_sha256 ?? '') ||
      (record.gender !== undefined && !['m', 'f', 'mf', 'nt'].includes(record.gender)) ||
      (record.separable !== undefined && typeof record.separable !== 'boolean') ||
      (record.gender === undefined && record.separable === undefined)
    )
      throw new Error('Invalid cited primary observation.');
    const observations = imported.entries.filter((e) => e.lemma === record.lemma);
    const disagreements = observations.flatMap((observation) =>
      observation.features.flatMap((feature) => {
        const conflicts = [];
        const genders = (value) => (value === 'mf' ? ['m', 'f'] : [value]);
        if (
          record.gender !== undefined &&
          feature.gender !== null &&
          !genders(record.gender).some((gender) => genders(feature.gender).includes(gender))
        )
          conflicts.push({
            field: 'gender',
            primary: record.gender,
            apertium: feature.gender,
            paradigm_id: feature.paradigm_id,
          });
        if (
          record.separable !== undefined &&
          feature.separable !== null &&
          record.separable !== feature.separable
        )
          conflicts.push({
            field: 'separable',
            primary: record.separable,
            apertium: feature.separable,
            paradigm_id: feature.paradigm_id,
          });
        return conflicts.map((conflict) => ({ ...conflict, source: observation.source }));
      }),
    );
    return {
      primary: structuredClone(record),
      observations,
      disagreements,
      action: 'inspect_only',
      language_check: 'not_run',
      lineage_caveat: caveat,
    };
  });
}

export function run(args = process.argv.slice(2)) {
  const [file, ...rest] = args;
  const options = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (!['--manifest', '--compare'].includes(rest[i]) || !rest[i + 1] || options[rest[i]])
      throw new Error('Invalid Apertium arguments.');
    options[rest[i]] = rest[i + 1];
  }
  if (!file)
    throw new Error(
      'Usage: content:apertium -- <local.dix> [--manifest <pin.json>] [--compare <primary.json>]',
    );
  const source = JSON.parse(
    readFileSync(
      options['--manifest'] ?? new URL('./sources/apertium-nld.json', import.meta.url),
      'utf8',
    ),
  );
  const imported = parseApertium(readFileSync(file), source);
  const report = { source, extractor, lineage_caveat: caveat, ...imported.report };
  if (options['--compare'])
    report.comparisons = compareApertium(
      imported,
      JSON.parse(readFileSync(options['--compare'], 'utf8')),
    );
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
