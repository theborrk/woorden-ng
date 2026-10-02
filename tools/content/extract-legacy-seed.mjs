import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, Script } from 'node:vm';

export const sourcePath = 'legacy/index.html';
export const fixturePath = 'content/legacy/seed-v1.json';
export const baselineCommit = 'e66ad1551a91ee31fe354a33a03cbfff4a66030d';
const root = fileURLToPath(new URL('../../', import.meta.url));

export function readSeed(html) {
  // The frozen source ends the declaration with an unindented ];. Never execute the HTML.
  const match = /^const SEED = (\[[\s\S]*?^\]);/m.exec(html);
  if (!match) throw new Error('Cannot find the SEED array declaration in legacy/index.html.');
  // No host objects or functions cross the VM boundary. Serialize inside the timed context.
  const context = createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false },
    microtaskMode: 'afterEvaluate',
  });
  const json = new Script(`JSON.stringify(${match[1]})`, { filename: sourcePath }).runInContext(
    context,
    { timeout: 1000 },
  );
  const rows = JSON.parse(json);
  if (!Array.isArray(rows)) throw new Error('SEED must be an array.');
  rows.forEach((row, i) => {
    const conjugation = row?.[6] ?? null;
    if (
      !Array.isArray(row) ||
      row.length < 6 ||
      row.length > 8 ||
      ![0, 2, 3, 5].every((j) => typeof row[j] === 'string') ||
      ![null, 'de', 'het'].includes(row[1]) ||
      !['zn', 'ww', 'bn', 'bw', 'vw', 'ov'].includes(row[4]) ||
      ![null, 'sep', 'agro', 'slang'].includes(row[7] ?? null) ||
      (conjugation !== null &&
        (typeof conjugation !== 'object' ||
          Array.isArray(conjugation) ||
          Object.keys(conjugation).sort().join(',') !== 'aux,vd,vt,vtp' ||
          !Object.values(conjugation).every(
            (value) => value === null || typeof value === 'string',
          )))
    ) {
      throw new Error(`Invalid SEED entry s${i}.`);
    }
  });
  return rows;
}

export function extractFixture(html) {
  return {
    formatVersion: 1,
    source: {
      path: sourcePath,
      sha256: createHash('sha256').update(html).digest('hex'),
      baselineCommit,
    },
    entries: readSeed(html).map((row, i) => ({
      legacyId: `s${i}`,
      nl: row[0],
      article: row[1],
      ru: row[2],
      en: row[3],
      pos: row[4],
      example: row[5],
      conjugation: row[6] ?? null,
      theme: row[7] ?? null,
    })),
  };
}

export function serializeFixture(fixture) {
  return `${JSON.stringify(fixture, null, 2)}\n`;
}

export function validateFixture(html, committed) {
  const fixture = JSON.parse(committed);
  const hash = createHash('sha256').update(html).digest('hex');
  if (fixture.source?.sha256 !== hash) {
    throw new Error(`Source hash mismatch: fixture ${fixture.source?.sha256}, source ${hash}.`);
  }
  if (committed !== serializeFixture(extractFixture(html))) {
    throw new Error(
      'Legacy seed fixture is out of date; run node tools/content/extract-legacy-seed.mjs.',
    );
  }
}

export function run(args = process.argv.slice(2)) {
  if (args.length > 1 || (args.length === 1 && args[0] !== '--validate')) {
    throw new Error('Usage: node tools/content/extract-legacy-seed.mjs [--validate]');
  }
  const html = readFileSync(resolve(root, sourcePath), 'utf8');
  const output = resolve(root, fixturePath);
  if (args[0] === '--validate') {
    validateFixture(html, readFileSync(output, 'utf8'));
    console.log('Legacy seed fixture matches the source hash and all entries.');
  } else {
    const fixture = extractFixture(html);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, serializeFixture(fixture));
    console.log(`Extracted ${fixture.entries.length} entries to ${fixturePath}.`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
