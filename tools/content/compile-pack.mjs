import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  digest,
  payloadHash,
  pointerValue,
  resolveProvenance,
  registry,
  validateEntry,
} from './validate-entry.mjs';
import { importSampleCheck } from './import-sample-check.mjs';

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const families = [
  'receptive',
  'productive',
  'article',
  'verb_form',
  'cloze',
  'picture',
  'listening',
  'spelling',
];

function factSupported(entry, pointer, evidence) {
  const provenance = resolveProvenance(entry, pointer);
  if (provenance?.status !== 'source_verified') return false;
  return (evidence.claims ?? []).some((claim) => {
    if (pointer !== claim.pointer && !pointer.startsWith(`${claim.pointer}/`)) return false;
    const source = entry.sources.find((s) => s.id === claim.source_id);
    const record = evidence.records?.[claim.source_id];
    const value = pointerValue(record, claim.selector);
    return (
      provenance.source_ids?.includes(claim.source_id) &&
      record !== undefined &&
      source &&
      digest(record) === source.record_sha256 &&
      value !== undefined &&
      digest(value) === digest(pointerValue(entry, claim.pointer))
    );
  });
}

/** Pure, per-task/locale decision. Validation and checks are independently supplied evidence. */
export function taskEligibility(
  entry,
  { validation, languageCheck = null, evidence = {}, media = [] },
) {
  const common = [];
  if (!validation.valid) common.push('invalid_structure_or_identity');
  if (entry.content_sha256 !== payloadHash(entry)) common.push('stale_payload_hash');
  if (
    !['ai_reviewed', 'batch_checked'].includes(languageCheck?.status) ||
    languageCheck?.content_sha256 !== entry.content_sha256
  )
    common.push('current_sample_check_required');
  if (['flagged', 'rejected', 'superseded'].includes(entry.review?.statuses?.disposition))
    common.push('blocked_disposition');
  if (entry.review?.statuses?.language_check === 'uncertain')
    common.push('uncertain_language_check');
  const lemmaReady = factSupported(entry, '/lexeme/lemma', evidence);
  const forms = (entry.forms ?? []).filter(
    (f, i) =>
      factSupported(entry, `/forms/${i}/surface`, evidence) &&
      f.applies_to_selected_sense !== false,
  );
  const mediaFor = (kind) =>
    media
      .filter(
        (asset) =>
          asset.kind === kind &&
          asset.entry_id === entry.id &&
          asset.content_sha256 === entry.content_sha256 &&
          asset.available === true &&
          asset.qa === 'passed' &&
          hasText(asset.qa_run_ref) &&
          hasText(asset.license) &&
          /^[0-9a-f]{64}$/.test(asset.sha256 ?? '') &&
          hasText(asset.id),
      )
      .map((asset) => asset.id);
  return Object.fromEntries(
    ['en', 'pl'].map((locale) => {
      const examples = (entry.examples ?? []).filter(
        (e) =>
          hasText(e.nl) &&
          hasText(e.translations?.[locale]) &&
          e.review_status !== 'flagged' &&
          e.target_form_ids.every((id) => forms.some((form) => form.id === id)),
      );
      const meaningReady = entry.sense?.meanings?.[locale]?.some(hasText) ?? false;
      return [
        locale,
        Object.fromEntries(
          families.map((family) => {
            const blockers = [...common];
            if (!meaningReady && family !== 'spelling') blockers.push(`missing_meaning_${locale}`);
            if (!lemmaReady) blockers.push('source_verified_lemma_required');
            let exampleIds = [],
              formIds = [],
              mediaIds = [];
            if (
              family === 'article' &&
              !(
                entry.lexeme.pos === 'noun' &&
                entry.lexeme.morphology.noun?.article?.accepted?.length &&
                factSupported(entry, '/lexeme/morphology/noun/article', evidence)
              )
            )
              blockers.push('source_verified_article_required');
            if (family === 'verb_form') {
              const supportedExamples = examples.filter((e) => e.target_form_ids.length > 0);
              exampleIds = supportedExamples.map((e) => e.id);
              formIds = [...new Set(supportedExamples.flatMap((e) => e.target_form_ids))];
              if (entry.lexeme.pos !== 'verb' || !formIds.length)
                blockers.push('source_verified_form_and_example_required');
            }
            if (family === 'cloze') {
              exampleIds = examples.map((e) => e.id);
              formIds = [...new Set(examples.flatMap((e) => e.target_form_ids))];
              if (!examples.length) blockers.push(`checked_example_${locale}_required`);
            }
            if (['listening', 'spelling', 'picture'].includes(family)) {
              mediaIds = mediaFor(family === 'picture' ? 'referent_image' : 'audio');
              if (!mediaIds.length)
                blockers.push(
                  family === 'picture'
                    ? 'reviewed_referent_image_required'
                    : 'tested_audio_required',
                );
            }
            return [
              family,
              {
                eligible: blockers.length === 0,
                blockers,
                example_ids: exampleIds,
                form_ids: formIds,
                media_ids: mediaIds,
              },
            ];
          }),
        ),
      ];
    }),
  );
}

function recordedChecks(state) {
  const checks = new Map();
  const errors = [];
  for (const receipt of state.sample_checks ?? []) {
    try {
      // A later sibling edit does not revoke unchanged entries' evidence. Reconstruct the
      // reviewed batch from retained revisions before validating its original response.
      const entries = state.entries.map((entry) => {
        const ref = receipt.packet.batch_manifest.entries.find((r) => r.id === entry.id);
        if (!ref || ref.content_sha256 === entry.content_sha256) return entry;
        const archived = state.history?.find(
          (h) => h.entry.id === ref.id && h.entry.content_sha256 === ref.content_sha256,
        )?.entry;
        if (!archived) throw new Error(`Missing reviewed revision ${ref.id}`);
        return archived;
      });
      const result = importSampleCheck(Buffer.from(receipt.raw_response, 'utf8'), {
        packet: receipt.packet,
        state: { ...state, entries, sample_checks: [] },
      });
      if (
        result.report.response_sha256 !== receipt.response_sha256 ||
        digest(result.report) !== digest(receipt.result)
      )
        throw new Error('Stored sample-check result/hash mismatch');
      for (const change of result.report.changes)
        checks.set(
          `${change.id}:${change.content_sha256}:${receipt.response_sha256}`,
          change.language_check,
        );
    } catch (error) {
      errors.push(error.message);
    }
  }
  return { checks, errors };
}

export function compilePack(state, { packId, version, evidence = {}, media = [] }) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      packId ?? '',
    ) ||
    !hasText(version) ||
    !Array.isArray(state?.entries) ||
    !Array.isArray(media)
  )
    throw new Error('Expected pack UUID, version, entry collection and media assessment array');
  if (new Set(state.entries.map((e) => e.id)).size !== state.entries.length)
    throw new Error('Duplicate entry ID');
  const { checks, errors } = recordedChecks(state);
  const entries = [],
    excluded = [],
    reports = [];
  for (const entry of [...state.entries].sort((a, b) => a.id.localeCompare(b.id, 'en'))) {
    const context = evidence[entry.fixture_ref] ?? {};
    // T-110 is a draft boundary: run its structural/source checks on a copy with only
    // importer-owned review bookkeeping reset, then verify approvals from raw receipts.
    const draft = structuredClone(entry);
    if (draft.review?.statuses) {
      draft.review.statuses.ai_review = 'not_run';
      draft.review.statuses.release = 'blocked';
    }
    const validated = validateEntry(draft, { ...context, allocations: state.registry ?? registry });
    const structuralErrors = validated.errors.filter((error) => !error.startsWith('source:'));
    const last = entry.review?.verification_log
      ?.filter((log) => log.stage === 'sample_check')
      .at(-1);
    const check = last
      ? checks.get(`${entry.id}:${entry.content_sha256}:${last.response_sha256}`)
      : null;
    const languageCheck = check === entry.review?.statuses?.language_check ? check : null;
    const decisions = taskEligibility(entry, {
      validation: { valid: structuralErrors.length === 0 },
      languageCheck: languageCheck
        ? { status: languageCheck, content_sha256: entry.content_sha256 }
        : null,
      evidence: context,
      media,
    });
    const tasks = Object.entries(decisions).flatMap(([locale, families]) =>
      Object.entries(families)
        .filter(([, decision]) => decision.eligible)
        .map(([family, decision]) => ({
          family,
          locale,
          example_ids: decision.example_ids,
          form_ids: decision.form_ids,
          media_ids: decision.media_ids,
        })),
    );
    reports.push({
      id: entry.id,
      content_sha256: entry.content_sha256,
      language_check: languageCheck,
      validation_errors: validated.errors,
      tasks: decisions,
    });
    if (tasks.length) entries.push({ entry: structuredClone(entry), tasks });
    else excluded.push(structuredClone(entry));
  }
  // Reject contradictory canonical copies; shared entities must not silently vary by sense.
  const entities = new Map();
  for (const { entry } of entries)
    for (const entity of [entry.lexeme, ...entry.forms, ...entry.examples]) {
      const hash = digest(entity);
      if (entities.has(entity.id) && entities.get(entity.id) !== hash)
        throw new Error(`Contradictory shared entity ${entity.id}`);
      entities.set(entity.id, hash);
    }
  const mediaIds = new Set(entries.flatMap(({ tasks }) => tasks.flatMap((task) => task.media_ids)));
  const selectedMedia = media.filter((asset) => mediaIds.has(asset.id));
  if (new Set(selectedMedia.map((asset) => asset.id)).size !== selectedMedia.length)
    throw new Error('Duplicate selected media ID');
  const pack = {
    schema_version: 'woorden-curated-pack-1',
    id: packId,
    version,
    entries,
    media: structuredClone(selectedMedia.sort((a, b) => a.id.localeCompare(b.id, 'en'))),
  };
  return {
    manifest: {
      schema_version: 'woorden-pack-manifest-1',
      compiler_version: 'task-locale-1',
      pack_id: packId,
      version,
      entry_schema_version: 'woorden-content-research-0.2',
      pack_sha256: digest(pack),
      entries: entries.map(({ entry, tasks }) => ({
        id: entry.id,
        content_sha256: entry.content_sha256,
        artifact_sha256: digest(entry),
        tasks_sha256: digest(tasks),
      })),
    },
    pack,
    excluded,
    report: {
      total_entries: state.entries.length,
      eligible_entries: entries.length,
      eligible_tasks: entries.reduce((sum, e) => sum + e.tasks.length, 0),
      sample_check_errors: errors,
      entries: reports,
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [input, ...args] = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (
        !['--id', '--version', '--evidence', '--media', '--output'].includes(args[i]) ||
        !args[i + 1] ||
        options[args[i]]
      )
        throw new Error('Expected --id, --version, --evidence, --media or --output once each');
      options[args[i]] = args[i + 1];
    }
    if (!input || !options['--output'])
      throw new Error(
        'Usage: content:compile STATE_OR_PACK.json --id UUID --version VERSION --output NEW_PACK.json [--evidence EVIDENCE.json] [--media QA.json]',
      );
    const read = (path) => (path ? JSON.parse(readFileSync(path, 'utf8')) : undefined);
    const result = compilePack(read(input), {
      packId: options['--id'],
      version: options['--version'],
      evidence: read(options['--evidence']),
      media: read(options['--media']),
    });
    writeFileSync(options['--output'], `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
    console.log(JSON.stringify(result.report, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
