import { createHash } from 'node:crypto';
import { createReadStream, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

const root = process.cwd();
const manifestPath = resolve(root, 'tools/content/kaikki-en-nl-postprocessed.manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const excludedTags = new Set([
  'archaic',
  'obsolete',
  'dated',
  'regional',
  'dialectal',
  'alternative',
  'Flanders',
  'Belgium',
  'Netherlands',
  'subjunctive',
  'gerund',
  'inflection-template',
  'table-tags',
  'class',
  'majestic',
  'colloquial',
]);

function sortedTags(tags) {
  return [...new Set(tags)].sort();
}

function featureKind(tags, word, lemma) {
  const tagSet = new Set(tags);
  const context = tagSet.has('main-clause')
    ? 'split-main-clause'
    : tagSet.has('subordinate-clause')
      ? 'joined-subordinate-clause'
      : 'unscoped';
  const modifiers = new Set(['main-clause', 'subordinate-clause', 'formal']);
  const grammatical = tags.filter((tag) => !modifiers.has(tag));
  const key = sortedTags(grammatical).join('|');
  if (key === 'infinitive' && word === lemma && context === 'unscoped') return 'joined-infinitive';
  if (key === 'infinitive' && context === 'unscoped') return 'infinitive';
  if (key === 'participle|past') return `${context}-past-participle`;
  const person = tagSet.has('first-person')
    ? 'first-person'
    : tagSet.has('third-person')
      ? 'third-person'
      : tagSet.has('second-person')
        ? 'second-person'
        : undefined;
  const number = tagSet.has('singular') ? 'singular' : tagSet.has('plural') ? 'plural' : undefined;
  const tense = tagSet.has('present') ? 'present' : tagSet.has('past') ? 'past' : undefined;
  if (person && number === 'singular' && tense) return `${context}-${tense}-${person}-${number}`;
  if (!person && number === 'plural' && tense) return `${context}-${tense}-plural`;
  return undefined;
}

function likelyFeatureKind(tags, word, lemma) {
  const scopeTags = new Set([
    'archaic',
    'obsolete',
    'dated',
    'regional',
    'dialectal',
    'Flanders',
    'Belgium',
    'Netherlands',
    'alternative',
    'majestic',
    'colloquial',
  ]);
  return featureKind(
    tags.filter((tag) => !scopeTags.has(tag)),
    word,
    lemma,
  );
}

function extractRecord(record, recordHash, selector) {
  const word = record.word;
  const candidates = [];
  const excluded = [];
  for (const [index, form] of (record.forms ?? []).entries()) {
    const tags = sortedTags(form.tags ?? []);
    const reasons = [];
    if (!form.form || typeof form.form !== 'string') reasons.push('missing-surface');
    for (const tag of tags) if (excludedTags.has(tag)) reasons.push(`excluded-tag:${tag}`);
    const kind = featureKind(tags, form.form, word);
    if (!kind) reasons.push('unsupported-feature-set');
    const observation = {
      surface: form.form ?? null,
      tags,
      likely_kind: likelyFeatureKind(tags, form.form, word) ?? null,
      source: {
        record_sha256: recordHash,
        selector: `/forms/${index}`,
      },
    };
    if (reasons.length === 0) candidates.push({ ...observation, kind });
    else excluded.push({ ...observation, reasons });
  }
  const ipa = (record.sounds ?? []).flatMap((sound, index) =>
    typeof sound.ipa === 'string' && sound.ipa.length > 0
      ? [
          {
            ipa: sound.ipa,
            tags: sound.tags ?? [],
            raw_tags: sound.raw_tags ?? [],
            source: { record_sha256: recordHash, selector: `/sounds/${index}/ipa` },
          },
        ]
      : [],
  );
  const formOf = (record.tags ?? []).includes('form-of');
  return {
    word,
    pos: record.pos,
    record_type: formOf ? 'form-of' : 'headword',
    source: {
      record_sha256: recordHash,
      selector,
      edition: 'en',
    },
    senses: (record.senses ?? []).map((sense, index) => ({
      index,
      glosses: sense.glosses ?? [],
      tags: sense.tags ?? [],
      source: { record_sha256: recordHash, selector: `/senses/${index}` },
    })),
    forms: formOf ? [] : candidates,
    excluded_forms: formOf
      ? [...candidates.map((form) => ({ ...form, reasons: ['form-of-record'] })), ...excluded]
      : excluded,
    ipa,
  };
}

export async function importWord({ sourcePath, word, sourceManifest = manifest }) {
  if (!word?.trim()) throw new Error('A Dutch headword is required.');
  const digest = createHash('sha256');
  let bytes = 0;
  let rows = 0;
  let dutchRows = 0;
  const entries = [];
  const input = createReadStream(sourcePath);
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    const raw = `${line}\n`;
    const rawBytes = Buffer.from(raw);
    digest.update(rawBytes);
    bytes += rawBytes.byteLength;
    rows += 1;
    if (!line.trim()) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid JSON on source line ${rows}.`, { cause: error });
    }
    if (record.lang_code !== 'nl') continue;
    dutchRows += 1;
    if (record.word !== word) continue;
    const recordHash = createHash('sha256').update(rawBytes).digest('hex');
    entries.push(extractRecord(record, recordHash, `/${rows - 1}`));
  }
  const actualHash = digest.digest('hex');
  if (bytes !== sourceManifest.bytes || actualHash !== sourceManifest.sha256) {
    throw new Error(
      `Source integrity check failed: expected ${sourceManifest.bytes} bytes / ${sourceManifest.sha256}; received ${bytes} bytes / ${actualHash}.`,
    );
  }
  return {
    report: {
      source_file: sourceManifest.file,
      source_sha256: actualHash,
      source_bytes: bytes,
      source_rows: rows,
      dutch_rows: dutchRows,
      matched_records: entries.length,
      included_forms: entries.reduce((sum, entry) => sum + entry.forms.length, 0),
      excluded_forms: entries.reduce((sum, entry) => sum + entry.excluded_forms.length, 0),
      ipa_transcriptions: entries.reduce((sum, entry) => sum + entry.ipa.length, 0),
      requested_word: word,
    },
    entries,
  };
}

export function requestDefaultForm(entry, kind, scope) {
  const matching = entry.forms.filter((form) => form.kind === kind);
  const risks = entry.excluded_forms.filter((form) => form.likely_kind === kind);
  if (scope) {
    const selected = matching.find(
      (form) =>
        form.source.record_sha256 === scope.record_sha256 &&
        form.source.selector === scope.selector,
    );
    return selected
      ? { status: 'selected', form: selected, scope: { ...scope } }
      : { status: 'not_found', choices: matching };
  }
  if (matching.length === 1 && risks.length === 0) {
    return { status: 'selected', form: matching[0], scope: null };
  }
  return { status: 'choice_required', choices: [...matching, ...risks] };
}

export function run(args = process.argv.slice(2)) {
  const wordIndex = args.indexOf('--word');
  const pathIndex = args.indexOf('--source');
  if (wordIndex < 0 || !args[wordIndex + 1]) {
    throw new Error(
      'Usage: node tools/content/import-kaikki-en.mjs --word <Dutch headword> [--source <JSONL path>]',
    );
  }
  const word = args[wordIndex + 1];
  const sourcePath = resolve(
    root,
    pathIndex >= 0 ? args[pathIndex + 1] : `.cache/content-sources/${manifest.file}`,
  );
  return importWord({ sourcePath, word });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(root, 'tools/content/import-kaikki-en.mjs')
) {
  try {
    const result = await run();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
