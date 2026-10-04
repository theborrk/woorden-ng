import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectSource, validateManifest } from './inspect-source.mjs';

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const namedServices = new Set(['DigiD', 'BSN']);
const defaultPin = (name) => new URL(`./sources/opentaal-${name}.manifest.json`, import.meta.url);

async function readPinned(file, expected) {
  validateManifest(expected);
  const metadata = Object.fromEntries(
    Object.entries(expected).filter(
      ([key]) => !['schema_version', 'bytes', 'sha256'].includes(key),
    ),
  );
  const manifest = await inspectSource(file, metadata, expected);
  const bytes = readFileSync(file);
  // Bind the parsed bytes to the inspection even if a local file changes between reads.
  if (createHash('sha256').update(bytes).digest('hex') !== manifest.sha256) {
    throw new Error('Source changed after inspection. File not adopted.');
  }
  return { manifest, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
}

export async function importOpenTaal(
  wordlistFile,
  versionFile,
  {
    wordlistManifest = readJson(defaultPin('wordlist')),
    versionManifest = readJson(defaultPin('version')),
  } = {},
) {
  const wordlist = await readPinned(wordlistFile, wordlistManifest);
  const marker = await readPinned(versionFile, versionManifest);
  const version = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (\d+\.\d+\.\d+)\r?\n$/.exec(marker.text);
  if (
    !version ||
    version[2] !== marker.manifest.version ||
    version[2] !== wordlist.manifest.version
  ) {
    throw new Error('OpenTaal version marker does not match both manifests. File not adopted.');
  }
  if (!wordlist.text.endsWith('\n')) {
    throw new Error('Incomplete OpenTaal wordlist: missing final newline. File not adopted.');
  }
  const lines = wordlist.text.slice(0, -1).split('\n');
  const index = new Map();
  for (const [i, raw] of lines.entries()) {
    const original = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (
      !original ||
      original.trim() !== original ||
      [...original].some(
        (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      )
    ) {
      throw new Error(`Invalid OpenTaal row ${i + 1}. File not adopted.`);
    }
    const observation = {
      source_id: wordlist.manifest.source_id,
      source_line: i + 1,
      original_spelling: original,
      sha256: createHash('sha256').update(`${raw}\n`).digest('hex'),
    };
    const observations = index.get(original) ?? [];
    observations.push(observation);
    index.set(original, observations);
  }
  return {
    index,
    report: {
      wordlist: wordlist.manifest,
      version_marker: { ...marker.manifest, original_text: marker.text },
      rows: lines.length,
      unique_spellings: index.size,
      duplicate_rows: lines.length - index.size,
      policy:
        'Case-sensitive exact membership; list misses require review, never automatic rejection. Spelling support is not linguistic approval.',
    },
  };
}

export function checkSpelling(imported, entries) {
  if (!Array.isArray(entries)) throw new Error('Expected an array of spelling entries.');
  const results = entries.map((record) => {
    if (
      !record ||
      typeof record !== 'object' ||
      typeof record.id !== 'string' ||
      !record.id.trim() ||
      typeof record.headword !== 'string' ||
      !record.headword.trim() ||
      (record.kind !== undefined && !['headword', 'compound', 'mwe'].includes(record.kind))
    ) {
      throw new Error(
        'Each spelling entry needs an id, headword and optional headword/compound/mwe kind.',
      );
    }
    const category = namedServices.has(record.headword)
      ? 'named_service'
      : /\s/u.test(record.headword)
        ? 'mwe'
        : (record.kind ?? 'headword');
    const observations = imported.index.get(record.headword) ?? [];
    return {
      record,
      category,
      snapshot: {
        source_id: imported.report.wordlist.source_id,
        sha256: imported.report.wordlist.sha256,
        version: imported.report.wordlist.version,
      },
      exact_match: observations.length > 0,
      observations,
      advisory: observations.length
        ? null
        : {
            code: 'opentaal_list_miss',
            action: 'review',
            message: `No exact OpenTaal list entry for this ${category}; absence does not prove a spelling error. Retain for review.`,
          },
    };
  });
  const categories = Object.fromEntries(
    ['headword', 'compound', 'mwe', 'named_service'].map((category) => {
      const group = results.filter((result) => result.category === category);
      const exact = group.filter((result) => result.exact_match).length;
      return [
        category,
        { records: group.length, exact_matches: exact, review_advisories: group.length - exact },
      ];
    }),
  );
  return { records: results.length, categories, results };
}

export async function run(args = process.argv.slice(2)) {
  const usage =
    'Usage: npm run content:spelling -- import <wordlist.txt> --version <version.txt> [--entries <entries.json>] [--wordlist-manifest <manifest.json> --version-manifest <manifest.json>]';
  if (
    args[0] !== 'import' ||
    !args[1] ||
    args[2] !== '--version' ||
    !args[3] ||
    args.length % 2 !== 0
  ) {
    throw new Error(usage);
  }
  const flags = new Map();
  for (let i = 4; i < args.length; i += 2) {
    if (
      !['--entries', '--wordlist-manifest', '--version-manifest'].includes(args[i]) ||
      !args[i + 1] ||
      flags.has(args[i])
    )
      throw new Error(usage);
    flags.set(args[i], args[i + 1]);
  }
  if (flags.has('--wordlist-manifest') !== flags.has('--version-manifest')) throw new Error(usage);
  const imported = await importOpenTaal(
    args[1],
    args[3],
    flags.has('--wordlist-manifest')
      ? {
          wordlistManifest: readJson(flags.get('--wordlist-manifest')),
          versionManifest: readJson(flags.get('--version-manifest')),
        }
      : {},
  );
  const checks = flags.has('--entries')
    ? checkSpelling(imported, readJson(flags.get('--entries')))
    : undefined;
  console.log(JSON.stringify({ ...imported.report, ...(checks ? { checks } : {}) }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
