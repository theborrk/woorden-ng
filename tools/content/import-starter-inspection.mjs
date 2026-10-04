import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, payloadHash, registry } from './validate-entry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = readFileSync(resolve(root, 'content/pilot/pilot.json'));
const pack = JSON.parse(source);

export function inspectionSlice(entries, count = 10) {
  if (![10, 60].includes(count))
    throw new Error('Expected first ten or full sixty-entry inspection');
  const selected = Array.from(
    { length: count },
    (_, i) => `S${String(i + 1).padStart(2, '0')}`,
  ).map((ref) => {
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
    for (const example of entry.examples) {
      let end = 0;
      if (
        example.target_sense_id !== entry.id ||
        example.target_form_ids.some((id) => !entry.forms.some((f) => f.id === id)) ||
        !example.translations.en ||
        !example.translations.pl ||
        example.nl !== example.nl.normalize('NFC') ||
        example.offset_unit !== 'UTF-16-code-units'
      )
        throw new Error(`Invalid example contract ${ref}`);
      for (const span of example.answer_spans) {
        if (
          !Number.isSafeInteger(span.start) ||
          !Number.isSafeInteger(span.end) ||
          span.start < end ||
          span.end > example.nl.length ||
          span.end <= span.start ||
          example.nl.slice(span.start, span.end) !== span.text ||
          span.text !== span.text.normalize('NFC') ||
          /[\uD800-\uDBFF]$|^[\uDC00-\uDFFF]/u.test(span.text)
        )
          throw new Error(`Invalid answer span ${ref}`);
        end = span.end;
      }
      if (
        digest(example.accepted_answers[0].ordered_segments) !==
        digest(example.answer_spans.map((s) => s.text))
      )
        throw new Error(`Invalid ordered answer ${ref}`);
    }
    return structuredClone(entry);
  });
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
    ...(count === 60 ? { shared_entities: sharedEvidence(selected) } : {}),
  };
}

function sharedEvidence(entries) {
  const sourceIds = (value) => {
    if (!value || typeof value !== 'object') return [];
    return [
      ...new Set([
        ...(Array.isArray(value.source_ids) ? value.source_ids : []),
        ...Object.values(value).flatMap(sourceIds),
      ]),
    ].sort();
  };
  const lexemes = [],
    forms = [];
  for (const [id, senses] of Object.entries(Object.groupBy(entries, (entry) => entry.lexeme.id))) {
    if (senses.length < 2) continue;
    if (
      senses.some(
        (e) => e.lexeme.lemma !== senses[0].lexeme.lemma || e.lexeme.pos !== senses[0].lexeme.pos,
      )
    )
      throw new Error(`Contradictory shared lexeme ${id}`);
    lexemes.push({
      id,
      lemma: senses[0].lexeme.lemma,
      pos: senses[0].lexeme.pos,
      sense_ids: senses.map((e) => e.id),
      form_ids: [...new Set(senses.flatMap((e) => e.forms.map((f) => f.id)))],
      source_ids: sourceIds(senses.map((e) => e.lexeme)),
      observations: senses.map((e) => ({
        sense_id: e.id,
        content_sha256: e.content_sha256,
        lexeme: e.lexeme,
      })),
    });
    const grouped = Object.groupBy(
      senses.flatMap((e) => e.forms.map((form) => ({ sense_id: e.id, form }))),
      (observation) => observation.form.id,
    );
    for (const [formId, observations] of Object.entries(grouped)) {
      const first = observations[0].form;
      if (
        observations.some(
          ({ form }) =>
            form.surface !== first.surface || digest(form.features) !== digest(first.features),
        )
      )
        throw new Error(`Contradictory shared form ${formId}`);
      forms.push({
        id: formId,
        lexeme_id: id,
        surface: first.surface,
        features: first.features,
        source_ids: sourceIds(observations),
        observations,
      });
    }
  }
  return { lexemes, forms };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const all = process.argv.includes('--all');
  const output = resolve(root, `content/inspection/starter-s01-s${all ? '60' : '10'}.json`);
  const bytes = `${JSON.stringify(inspectionSlice(pack.entries, all ? 60 : 10), null, 2)}\n`;
  if (process.argv[2] === '--check') {
    if (digest(JSON.parse(readFileSync(output, 'utf8'))) !== digest(JSON.parse(bytes)))
      throw new Error('Starter inspection artifact is stale');
  } else if (process.argv[2] === '--write') {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, bytes);
  } else {
    throw new Error(
      'Usage: node tools/content/import-starter-inspection.mjs --write|--check [--all]',
    );
  }
}
