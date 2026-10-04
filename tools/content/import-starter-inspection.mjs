import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, payloadHash, registry } from './validate-entry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = readFileSync(resolve(root, 'research/content-2026-10/content/starter-pack.json'));
const pack = JSON.parse(source);

export function inspectionSlice(entries) {
  const selected = Array.from({ length: 10 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`).map(
    (ref) => {
      const matches = entries.filter((entry) => entry.fixture_ref === ref);
      if (matches.length !== 1) throw new Error(`Missing/duplicate ${ref}`);
      const entry = matches[0];
      const issued = (id, prefix) =>
        Object.entries(registry).some(([key, value]) => key.startsWith(prefix) && value === id);
      if (
        entry.id !== registry[`sense:${ref}`] ||
        entry.sense.id !== entry.id ||
        entry.lexeme.id !== registry[`sense-lexeme:${entry.id}`] ||
        entry.sense.lexeme_id !== entry.lexeme.id ||
        entry.forms.some((form) => !issued(form.id, `form:${entry.lexeme.id}:`)) ||
        entry.examples.some((example) => !issued(example.id, `example:${ref}:`)) ||
        payloadHash(entry) !== entry.content_sha256
      )
        throw new Error(`Changed identity/hash for ${ref}`);
      return structuredClone(entry);
    },
  );
  return {
    schema_version: 'woorden-starter-inspection-1',
    inspection_only: true,
    source_artifact_sha256: createHash('sha256').update(source).digest('hex'),
    assessment: {
      origin: 'generated_draft',
      structure: 'unchecked',
      language_check: 'not_run',
      release: 'blocked',
      source_evidence: 'research_assertions_only',
    },
    entries: selected,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = resolve(root, 'content/inspection/starter-s01-s10.json');
  const bytes = `${JSON.stringify(inspectionSlice(pack.entries), null, 2)}\n`;
  if (process.argv[2] === '--check') {
    if (digest(JSON.parse(readFileSync(output, 'utf8'))) !== digest(JSON.parse(bytes)))
      throw new Error('Starter inspection artifact is stale');
  } else if (process.argv[2] === '--write') {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, bytes);
  } else {
    throw new Error('Usage: node tools/content/import-starter-inspection.mjs --write|--check');
  }
}
