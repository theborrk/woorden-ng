import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const directory = dirname(fileURLToPath(import.meta.url));
const schema = readJson(resolve(directory, 'schemas/sense-entry.schema.json'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const checkSchema = ajv.compile({ $defs: schema.$defs, $ref: '#/$defs/entry' });
export const registry = readJson(resolve(directory, '../../content/id-registry.json'));

// Sorted, compact UTF-8 JSON. The research contract serializes NT2Lex exposures as floats.
export function digest(value, exposureFloats = false) {
  const canonical = (v, path = '') => {
    if (
      exposureFloats &&
      /^\/cefr\/source_exposure\/\d+\/frequencies\/(A1|A2|B1|B2|C1)$/.test(path) &&
      Number.isInteger(v)
    )
      return JSON.rawJSON(`${v}.0`);
    if (Array.isArray(v)) return v.map((item, i) => canonical(item, `${path}/${i}`));
    if (v !== null && typeof v === 'object') {
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((key) => [key, canonical(v[key], `${path}/${key}`)]),
      );
    }
    return v;
  };
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
}

export function payloadHash(entry) {
  return digest(
    Object.fromEntries(
      Object.entries(entry).filter(([k]) => !['review', 'content_sha256'].includes(k)),
    ),
    true,
  );
}

export function pointerValue(object, pointer) {
  if (pointer === '') return object;
  if (!/^\/(?:[^~]|~[01])*$/.test(pointer)) return undefined;
  return pointer
    .slice(1)
    .split('/')
    .reduce((value, token) => {
      const key = token.replaceAll('~1', '/').replaceAll('~0', '~');
      return value !== null && typeof value === 'object' && Object.hasOwn(value, key)
        ? value[key]
        : undefined;
    }, object);
}

export function resolveProvenance(entry, pointer) {
  // Direct item references override a group, including a more specific prefix within that group.
  const parts = pointer.split('/');
  for (let end = parts.length; end > 1; end--) {
    const item = pointerValue(entry, parts.slice(0, end).join('/'));
    if (item && !Array.isArray(item) && Array.isArray(item.source_ids) && item.status) return item;
  }
  const prefix = Object.keys(entry.provenance)
    .filter((p) => pointer === p || pointer.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];
  return entry.provenance[prefix];
}

/** Evidence is supplied separately by a source importer, never inferred from an entry URL.
 * records: { sourceId: original JSON record }; claims: exact target/source JSON-pointer pairs.
 */
export function validateEntry(entry, { records = {}, claims = [] } = {}) {
  if (!checkSchema(entry))
    return {
      valid: false,
      errors: checkSchema.errors.map((e) => `schema:${e.instancePath}: ${e.message}`),
    };
  if (
    !records ||
    Array.isArray(records) ||
    typeof records !== 'object' ||
    !Array.isArray(claims) ||
    claims.some(
      (c) =>
        !c ||
        typeof c.pointer !== 'string' ||
        typeof c.source_id !== 'string' ||
        typeof c.selector !== 'string',
    )
  )
    return { valid: false, errors: ['schema: invalid evidence bundle'] };
  const errors = [];
  const check = (ok, message) => {
    if (!ok) errors.push(message);
  };
  const allocated = (id, prefix) =>
    Object.entries(registry).some(([key, value]) => key.startsWith(prefix) && value === id);
  check(
    registry[`sense:${entry.fixture_ref}`] === entry.id,
    'identity: sense ID differs from committed allocation',
  );
  check(
    entry.id === entry.sense.id && entry.lexeme.id === entry.sense.lexeme_id,
    'links: sense/lexeme mismatch',
  );
  check(
    allocated(entry.lexeme.id, 'lexeme:') &&
      registry[`sense-lexeme:${entry.id}`] === entry.lexeme.id,
    'identity: unallocated or wrongly linked lexeme',
  );
  const seen = new Set([entry.id, entry.lexeme.id]);
  for (const [item, prefix] of [
    ...entry.forms.map((f) => [f, `form:${entry.lexeme.id}:`]),
    ...entry.examples.map((e) => [e, `example:${entry.fixture_ref}:`]),
  ]) {
    check(allocated(item.id, prefix), 'identity: unallocated or wrongly owned form/example');
    check(!seen.has(item.id), 'identity: duplicate ID');
    seen.add(item.id);
  }
  check(entry.content_sha256 === payloadHash(entry), 'hash: semantic payload mismatch');
  const sources = new Map(entry.sources.map((s) => [s.id, s]));
  check(sources.size === entry.sources.length, 'sources: duplicate ID');
  const supported = (pointer, evidence) => {
    if (pointerValue(entry, pointer) === undefined) {
      check(false, `source: dangling scope ${pointer}`);
      return;
    }
    check(
      Array.isArray(evidence.source_ids) && evidence.source_ids.length > 0,
      `source: ${pointer} has no evidence`,
    );
    check(
      Array.isArray(evidence.source_ids) &&
        evidence.source_ids.some((id) => {
          const source = sources.get(id);
          const record = records[id];
          if (!source || record === undefined || digest(record) !== source.record_sha256)
            return false;
          return claims.some(
            (claim) =>
              claim.pointer === pointer &&
              claim.source_id === id &&
              (!evidence.source_selector ||
                claim.selector ===
                  `${evidence.source_selector}/${pointer.endsWith('/surface') ? 'form' : 'ipa'}`) &&
              pointerValue(record, claim.selector) !== undefined &&
              digest(pointerValue(record, claim.selector)) === digest(pointerValue(entry, pointer)),
          );
        }),
      `source: ${pointer} lacks a pinned observation for its exact value/scope`,
    );
  };
  for (const [pointer, evidence] of Object.entries(entry.provenance)) {
    check(
      pointerValue(entry, pointer) !== undefined,
      `provenance: invalid/dangling pointer ${pointer}`,
    );
    check(
      evidence.source_ids.every((id) => sources.has(id)),
      `provenance: dangling source at ${pointer}`,
    );
    if (evidence.status === 'source_verified') {
      // Inventory items have their own selectors/status; an enclosing tag cannot attest them.
      if (pointer === '/forms' || pointer === '/lexeme/pronunciation') continue;
      const overridden = Object.keys(entry.provenance).some((p) => p.startsWith(`${pointer}/`));
      if (!overridden) supported(pointer, evidence);
      else {
        const visit = (value, path) => {
          if (value !== null && typeof value === 'object') {
            for (const [key, child] of Object.entries(value))
              visit(child, `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`);
          } else {
            const scoped = resolveProvenance(entry, path);
            if (scoped?.status === 'source_verified') supported(path, scoped);
          }
        };
        visit(pointerValue(entry, pointer), pointer);
      }
    }
  }
  for (const pointer of [
    '/sense/definition_nl',
    '/sense/meanings/en',
    '/sense/meanings/pl',
    '/examples',
    '/lexeme/lemma',
    '/lexeme/display',
  ]) {
    check(Boolean(resolveProvenance(entry, pointer)), `provenance: missing scope ${pointer}`);
  }
  for (const [i, form] of entry.forms.entries()) {
    check(
      form.source_ids.every((id) => sources.has(id)),
      `source: dangling form source ${i}`,
    );
    supported(`/forms/${i}/surface`, form);
    check(
      !form.features.source_tags.some((tag) =>
        ['archaic', 'obsolete', 'table-tags', 'inflection-template', 'class'].includes(tag),
      ),
      'forms: forbidden default source tag',
    );
    check(form.grading_enabled === false, 'review: draft form cannot enable grading');
  }
  for (const [i, ipa] of entry.lexeme.pronunciation.ipa.entries()) {
    check(
      ipa.source_ids.every((id) => sources.has(id)),
      `source: dangling IPA source ${i}`,
    );
    supported(`/lexeme/pronunciation/ipa/${i}/ipa`, ipa);
  }
  const scanAssertions = (value, path = '') => {
    if (value === null || typeof value !== 'object') return;
    if (
      value.status === 'source_verified' &&
      !path.startsWith('/provenance/') &&
      !/^\/forms\/\d+$/.test(path) &&
      !/^\/lexeme\/pronunciation\/ipa\/\d+$/.test(path)
    ) {
      const evidence = Array.isArray(value.source_ids) ? value : resolveProvenance(entry, path);
      check(
        Boolean(evidence) && evidence.status === 'source_verified',
        `source: unscoped assertion ${path}`,
      );
      if (evidence?.status === 'source_verified') supported(path, evidence);
    }
    for (const [key, child] of Object.entries(value)) scanAssertions(child, `${path}/${key}`);
  };
  scanAssertions(entry);
  const seed = readJson(resolve(directory, '../../content/legacy/seed-v1.json')).entries;
  for (const legacy of entry.legacy) {
    const original = seed.find((row) => row.legacyId === legacy?.legacy_id);
    check(
      Boolean(original) && legacy.original_ru === original.ru && legacy.original_en === original.en,
      'legacy: original text or mapping changed',
    );
  }
  const noun = entry.lexeme.morphology.noun;
  const verb = entry.lexeme.morphology.verb;
  check((noun !== null) === (entry.lexeme.pos === 'noun'), 'morphology: noun/POS mismatch');
  check((verb !== null) === (entry.lexeme.pos === 'verb'), 'morphology: verb/POS mismatch');
  if (noun?.article)
    check(
      Array.isArray(noun.article.accepted) &&
        noun.article.accepted.length > 0 &&
        noun.article.accepted.every((a) => ['de', 'het'].includes(a)),
      'morphology: invalid article set',
    );
  if (noun?.countability === 'mass_in_this_sense')
    check(
      noun.plural?.applies_to_selected_sense === false,
      'morphology: mass plural cannot be unrestricted',
    );
  if (verb)
    check(
      Array.isArray(verb.forms) && verb.forms.every((id) => entry.forms.some((f) => f.id === id)),
      'links: unknown morphology form',
    );
  if (verb?.separable)
    check(
      Boolean(verb.particle) &&
        Array.isArray(verb.split_form_ids) &&
        verb.split_form_ids.length > 0 &&
        verb.split_form_ids.every((id) => entry.forms.some((f) => f.id === id)),
      'links: incomplete separable forms',
    );
  for (const link of entry.sense.confusion_links)
    check(allocated(link.sense_id, 'sense:'), 'links: unknown confusion sense');
  for (const example of entry.examples) {
    check(example.target_sense_id === entry.id, 'links: wrong example sense');
    const forms = example.target_form_ids.map((id) => entry.forms.find((f) => f.id === id));
    check(
      forms.every(Boolean) && (!verb || forms.length > 0),
      'links: unknown/missing target form',
    );
    check(example.nl === example.nl.normalize('NFC'), 'spans: text must already be NFC');
    let last = 0;
    for (const span of example.answer_spans) {
      check(
        span.start >= last && span.end > span.start && span.end <= example.nl.length,
        'spans: unordered/overlapping/out of bounds',
      );
      check(
        example.nl.slice(span.start, span.end) === span.text &&
          span.text === span.text.normalize('NFC') &&
          !/[\uD800-\uDBFF]$|^[\uDC00-\uDFFF]/u.test(span.text),
        'spans: UTF-16 slice mismatch or split surrogate',
      );
      last = span.end;
    }
    const segments = example.answer_spans.map((s) => s.text);
    check(
      digest(example.accepted_answers[0].ordered_segments) === digest(segments),
      'spans: ordered answer mismatch',
    );
    if (forms.length > 0)
      check(
        forms.some((f) => f?.surface === segments.join(' ')),
        'links: segments do not match target form',
      );
    check(
      example.task_contract.valid_alternative === 'ungradable_prompt_repair' &&
        example.task_contract.unrestricted_fuzzy_match === false,
      'contract: unsafe ambiguous grading',
    );
    check(
      example.review_status !== 'ai_reviewed',
      'review: imported draft cannot self-certify example review',
    );
  }
  check(
    entry.review.statuses.ai_review === 'not_run' && entry.review.statuses.release === 'blocked',
    'review: independent review import is required; draft cannot self-certify',
  );
  return { valid: errors.length === 0, errors };
}

export function inspectEligibility(entry, validation) {
  const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
  const result = {};
  for (const locale of ['en', 'pl']) {
    const meanings = entry.sense.meanings[locale];
    const meaning = Array.isArray(meanings) && meanings.some(hasText);
    const example = entry.examples.some((e) => hasText(e.nl) && hasText(e.translations[locale]));
    const noun = entry.lexeme.morphology.noun;
    const requirements = {
      receptive: [meaning, true],
      productive: [meaning, true],
      article: [meaning, Boolean(noun?.article?.accepted?.length)],
      verb_form: [meaning, example && entry.lexeme.pos === 'verb' && entry.forms.length > 0],
      cloze: [meaning, example],
      listening: [meaning, false],
      spelling: [true, false],
      picture: [meaning, false],
    };
    result[locale] = Object.fromEntries(
      Object.entries(requirements).map(([family, [hasMeaning, hasCue]]) => {
        const blockers = [];
        if (!validation.valid) blockers.push('invalid_entry');
        if (!hasMeaning) blockers.push(`missing_meaning_${locale}`);
        if (!hasCue)
          blockers.push(
            {
              article: 'missing_article',
              verb_form: 'missing_form_or_example',
              cloze: `missing_example_${locale}`,
              listening: 'tested_audio_required',
              spelling: 'tested_audio_required',
              picture: 'reviewed_image_required',
            }[family],
          );
        return [
          family,
          {
            data_ready: blockers.length === 0,
            eligible: false,
            blockers: [...blockers, 'independent_review_required'],
          },
        ];
      }),
    );
  }
  return result;
}

export function inspectEntry(entry, context) {
  const validation = validateEntry(entry, context);
  return {
    ...validation,
    eligibility: validation.errors.some((e) => e.startsWith('schema:'))
      ? null
      : inspectEligibility(entry, validation),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [path, evidencePath] = process.argv.slice(2);
    if (!path)
      throw new Error('Usage: node tools/content/validate-entry.mjs ENTRY.json [EVIDENCE.json]');
    const report = inspectEntry(readJson(path), evidencePath ? readJson(evidencePath) : undefined);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.valid ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
