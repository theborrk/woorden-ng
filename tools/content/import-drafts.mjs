import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { TextDecoder } from 'node:util';
import { digest, payloadHash, registry, validateEntry } from './validate-entry.mjs';

const schema = JSON.parse(
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), 'schemas/sense-entry.schema.json'),
    'utf8',
  ),
);
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const checkBatch = ajv.compile({
  type: 'object',
  required: ['schema_version', 'batch_id', 'generation', 'entries'],
  additionalProperties: false,
  $defs: schema.$defs,
  properties: {
    schema_version: { const: 'woorden-draft-batch-1' },
    batch_id: { $ref: '#/$defs/text' },
    generation: {
      type: 'object',
      required: ['vendor', 'model', 'version', 'run_ref', 'prompt_sha256', 'input_sha256'],
      additionalProperties: false,
      properties: Object.fromEntries(
        ['vendor', 'model', 'version', 'run_ref', 'prompt_sha256', 'input_sha256'].map((key) => [
          key,
          key.endsWith('_sha256')
            ? { anyOf: [{ $ref: '#/$defs/hash' }, { type: 'null' }] }
            : { type: ['string', 'null'], minLength: 1 },
        ]),
      ),
    },
    entries: { type: 'array', minItems: 1, items: { $ref: '#/$defs/entry' } },
  },
});

export function emptyDraftState() {
  return {
    schema_version: 'woorden-draft-state-1',
    registry: structuredClone(registry),
    entries: [],
    artifacts: [],
    batches: [],
    history: [],
  };
}

function assertState(state) {
  if (
    state?.schema_version !== 'woorden-draft-state-1' ||
    !state.registry ||
    !['entries', 'artifacts', 'batches', 'history'].every((key) => Array.isArray(state[key])) ||
    Object.entries(registry).some(([key, id]) => state.registry[key] !== id)
  )
    throw new Error('Invalid draft state or changed committed allocation');
  const ids = new Set();
  for (const entry of state.entries) {
    if (
      ids.has(entry.id) ||
      state.registry[`sense:${entry.fixture_ref}`] !== entry.id ||
      state.registry[`sense-lexeme:${entry.id}`] !== entry.lexeme.id ||
      entry.content_sha256 !== payloadHash(entry)
    )
      throw new Error('Invalid stored entry identity/hash');
    ids.add(entry.id);
  }
}

function rejectApprovals(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (
      ['language_reviewed', 'batch_checked', 'ai_reviewed', 'eligible'].includes(child) ||
      (['grading_enabled', 'listening_task_eligible', 'publication_eligible'].includes(key) &&
        child === true) ||
      (key === 'approved_audio' && Array.isArray(child) && child.length > 0)
    )
      throw new Error(`Producer approval rejected at ${key}: recorded sample check required`);
    rejectApprovals(child);
  }
}

/** Local artifacts only. The prior state is an operator-owned output, never producer input. */
export function importDraftBatch(
  artifact,
  { state = emptyDraftState(), evidence = {}, allocateId = randomUUID } = {},
) {
  const batch = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(artifact)));
  if (!checkBatch(batch))
    throw new Error(`Invalid draft batch: ${ajv.errorsText(checkBatch.errors)}`);
  rejectApprovals(batch);
  assertState(state);
  const next = structuredClone(state);
  const artifactHash = createHash('sha256').update(artifact).digest('hex');
  const changes = [];
  const batchRefs = new Set();
  const remap = new Map();
  const allocate = (key, supplied, prefix) => {
    const existing = next.registry[key];
    const issued = Object.entries(next.registry).find(
      ([label, id]) => label.startsWith(prefix) && id === supplied,
    )?.[1];
    if (prefix === 'sense:' && issued && !existing)
      throw new Error('An issued sense ID cannot acquire another allocation label');
    if (existing && issued && existing !== issued) throw new Error(`Conflicting identity: ${key}`);
    const id = existing ?? issued ?? allocateId();
    if (!existing && !issued && Object.values(next.registry).includes(id))
      throw new Error('Allocator returned a duplicate ID');
    if (remap.has(supplied) && remap.get(supplied) !== id)
      throw new Error('Producer identity reused for different entities');
    next.registry[key] = id;
    remap.set(supplied, id);
    return id;
  };
  // Allocate the whole batch before resolving cross-entry confusion links.
  for (const entry of batch.entries) {
    if (batchRefs.has(entry.fixture_ref)) throw new Error('Duplicate sense allocation label');
    batchRefs.add(entry.fixture_ref);
    if (entry.id !== entry.sense.id || entry.lexeme.id !== entry.sense.lexeme_id)
      throw new Error('Producer sense/lexeme links disagree');
    const senseId = allocate(`sense:${entry.fixture_ref}`, entry.id, 'sense:');
    const lexemeId = allocate(`lexeme:external:${entry.lexeme.id}`, entry.lexeme.id, 'lexeme:');
    const binding = `sense-lexeme:${senseId}`;
    if (next.registry[binding] && next.registry[binding] !== lexemeId)
      throw new Error('A sense cannot silently move to another lexeme');
    next.registry[binding] = lexemeId;
    for (const form of entry.forms)
      allocate(`form:${lexemeId}:external:${form.id}`, form.id, `form:${lexemeId}:`);
    for (const example of entry.examples)
      allocate(
        `example:${entry.fixture_ref}:external:${example.id}`,
        example.id,
        `example:${entry.fixture_ref}:`,
      );
  }
  const batchEntries = [];
  for (const input of batch.entries) {
    const entry = structuredClone(input);
    const link = (id) => remap.get(id) ?? id;
    entry.id = link(entry.id);
    entry.sense.id = link(entry.sense.id);
    entry.lexeme.id = link(entry.lexeme.id);
    entry.sense.lexeme_id = link(entry.sense.lexeme_id);
    for (const form of entry.forms) form.id = link(form.id);
    for (const example of entry.examples) {
      example.id = link(example.id);
      example.target_sense_id = link(example.target_sense_id);
      example.target_form_ids = example.target_form_ids.map(link);
    }
    for (const relation of entry.sense.confusion_links) relation.sense_id = link(relation.sense_id);
    const verb = entry.lexeme.morphology.verb;
    if (verb) {
      verb.forms = verb.forms.map(link);
      if (verb.split_form_ids) verb.split_form_ids = verb.split_form_ids.map(link);
    }
    const oldIndex = next.entries.findIndex((e) => e.id === entry.id);
    const old = next.entries[oldIndex];
    entry.revision = old?.revision ?? 1;
    entry.generation = {
      ...entry.generation,
      batch_id: batch.batch_id,
      provenance: batch.generation,
    };
    entry.review = {
      statuses: {
        origin: 'generated_draft',
        structure: 'machine_checked',
        ai_review: 'not_run',
        language_check: 'not_run',
        disposition: 'draft',
        release: 'blocked',
      },
      risk_categories: entry.review.risk_categories,
      verification_log: [],
      unresolved_doubts: entry.review.unresolved_doubts,
    };
    const unchanged = old && old.content_sha256 === payloadHash(entry);
    if (old && !unchanged) entry.revision++;
    entry.content_sha256 = payloadHash(entry);
    const validation = validateEntry(entry, {
      ...evidence[entry.fixture_ref],
      allocations: next.registry,
    });
    if (!validation.valid) throw new Error(`${entry.fixture_ref}: ${validation.errors.join('; ')}`);
    const action = !old ? 'added' : unchanged ? 'unchanged' : 'updated';
    changes.push({
      id: entry.id,
      action,
      revision: entry.revision,
      previous_sha256: old?.content_sha256 ?? null,
      content_sha256: entry.content_sha256,
      reviews_invalidated: Boolean(old && !unchanged),
    });
    if (old && !unchanged) next.history.push({ entry: old, replaced_by: entry.content_sha256 });
    if (!old) next.entries.push(entry);
    else if (!unchanged) next.entries[oldIndex] = entry;
    batchEntries.push({ id: entry.id, content_sha256: entry.content_sha256 });
  }
  if (!next.artifacts.some((a) => a.sha256 === artifactHash))
    next.artifacts.push({
      sha256: artifactHash,
      bytes: Buffer.byteLength(artifact),
      batch_id: batch.batch_id,
    });
  const manifest = {
    batch_id: batch.batch_id,
    artifact_sha256: artifactHash,
    generation: batch.generation,
    entries: batchEntries,
  };
  if (!next.batches.some((b) => digest(b) === digest(manifest))) next.batches.push(manifest);
  return {
    state: next,
    report: { artifact_sha256: artifactHash, changes, entry_count: next.entries.length },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [input, ...args] = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i];
      if (!['--state', '--evidence', '--output'].includes(key) || !args[i + 1] || options[key])
        throw new Error('Expected --state, --evidence or --output PATH, each at most once');
      options[key] = args[i + 1];
    }
    if (!input || !options['--output'])
      throw new Error(
        'Usage: content:import-drafts BATCH.json --output NEW_STATE.json [--state STATE.json] [--evidence EVIDENCE.json]',
      );
    const read = (path) => (path ? JSON.parse(readFileSync(path, 'utf8')) : undefined);
    const result = importDraftBatch(readFileSync(input), {
      state: read(options['--state']),
      evidence: read(options['--evidence']),
    });
    // Exclusive creation preserves the prior committed state even on a failed/repeated import.
    writeFileSync(options['--output'], `${JSON.stringify(result.state, null, 2)}\n`, {
      flag: 'wx',
    });
    console.log(JSON.stringify(result.report, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
