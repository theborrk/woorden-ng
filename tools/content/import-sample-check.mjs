import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { exportSample } from './sample-check.mjs';
import { digest } from './validate-entry.mjs';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(
  JSON.parse(
    readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), 'schemas/sample-check-response.schema.json'),
      'utf8',
    ),
  ),
);
const normalized = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const manifestHash = (manifest) =>
  digest({
    ...manifest,
    entries: [...manifest.entries].sort((a, b) => a.id.localeCompare(b.id, 'en')),
  });

/** Packet and state are operator-owned artifacts, never supplied by the draft author. */
export function importSampleCheck(artifact, { packet, state }) {
  const raw = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(artifact));
  const response = JSON.parse(raw);
  if (!validate(response))
    throw new Error(`Invalid sample response: ${ajv.errorsText(validate.errors)}`);
  if (state?.schema_version !== 'woorden-draft-state-1' || !Array.isArray(state.batches))
    throw new Error('Expected operator-owned draft state');
  const manifest = packet?.batch_manifest;
  if (
    !manifest ||
    !state.batches.some((batch) => manifestHash(batch) === manifestHash(manifest)) ||
    digest(JSON.parse(exportSample(manifest, state.entries, packet.seed))) !== digest(packet)
  )
    throw new Error('Packet does not match stored batch manifest, seed or current entries');
  if (
    response.batch_id !== manifest.batch_id ||
    response.batch_manifest_sha256 !== packet.batch_manifest_sha256 ||
    response.seed !== packet.seed
  )
    throw new Error('Response batch manifest or seed does not match packet');
  const vendor = normalized(response.reviewer.vendor);
  const authors = [
    manifest.generation.vendor,
    ...manifest.entries.map(
      (ref) => state.entries.find((e) => e.id === ref.id)?.generation.provenance?.vendor,
    ),
  ];
  if (!vendor || authors.some((author) => !normalized(author) || normalized(author) === vendor))
    throw new Error('Reviewer vendor must differ from every recorded author vendor');
  const verdicts = new Map();
  for (const verdict of response.verdicts) {
    const sample = packet.entries.find((e) => e.id === verdict.id);
    if (!sample || sample.content_sha256 !== verdict.content_sha256 || verdicts.has(verdict.id))
      throw new Error(`Unknown, duplicate or stale sampled entry ${verdict.id}`);
    if (verdict.verdict === 'fix' && !normalized(verdict.problem_type))
      throw new Error('A fix needs a nonblank problem type');
    verdicts.set(verdict.id, verdict);
  }
  if (verdicts.size !== packet.entries.length) throw new Error('Missing sampled entry verdict');

  const responseHash = createHash('sha256').update(artifact).digest('hex');
  const previous = state.sample_checks?.find((check) => check.response_sha256 === responseHash);
  if (previous) return { state: structuredClone(state), report: structuredClone(previous.result) };
  const problems = new Map();
  for (const verdict of verdicts.values())
    if (verdict.verdict === 'fix') {
      const key = normalized(verdict.problem_type);
      problems.set(key, [...(problems.get(key) ?? []), verdict.id]);
    }
  const systematic = [...problems].filter(([, ids]) => ids.length >= 2);
  // R1–R5 cover exercise construction, not wrong meanings/translations in risky senses.
  const riskMeaningErrors = packet.entries
    .filter((sample) => {
      const verdict = verdicts.get(sample.id);
      return (
        sample.risk_categories.length > 0 &&
        verdict.verdict === 'fix' &&
        verdict.question === 'meaning_translation'
      );
    })
    .map((sample) => sample.id);
  const outcome = systematic.length || riskMeaningErrors.length ? 'failed' : 'passed';
  const next = structuredClone(state);
  const changes = manifest.entries.map((ref) => {
    const entry = next.entries.find((e) => e.id === ref.id);
    const verdict = verdicts.get(ref.id);
    const languageCheck =
      outcome === 'failed'
        ? 'not_run'
        : !verdict
          ? 'batch_checked'
          : { pass: 'ai_reviewed', fix: 'revision_requested', unsure: 'uncertain' }[
              verdict.verdict
            ];
    entry.review.statuses.language_check = languageCheck;
    entry.review.statuses.ai_review = languageCheck === 'batch_checked' ? 'not_run' : languageCheck;
    entry.review.statuses.release = 'blocked';
    if (
      languageCheck === 'uncertain' &&
      !['rejected', 'superseded'].includes(entry.review.statuses.disposition)
    )
      entry.review.statuses.disposition = 'flagged';
    entry.review.verification_log.push({
      stage: 'sample_check',
      batch_id: manifest.batch_id,
      content_sha256: ref.content_sha256,
      response_sha256: responseHash,
      outcome,
      language_check: languageCheck,
      verdict: verdict ?? null,
    });
    return {
      ...ref,
      language_check: languageCheck,
      disposition: entry.review.statuses.disposition,
    };
  });
  const report = {
    batch_id: manifest.batch_id,
    response_sha256: responseHash,
    outcome,
    systematic_problems: Object.fromEntries(systematic),
    risk_meaning_errors: riskMeaningErrors,
    changes,
  };
  next.sample_checks ??= [];
  next.sample_checks.push({
    raw_response: raw,
    response_sha256: responseHash,
    packet,
    result: report,
  });
  return { state: next, report };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [input, ...args] = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i++) {
      const key = args[i];
      if (
        !['--packet', '--state', '--output', '--dry-run'].includes(key) ||
        Object.hasOwn(options, key)
      )
        throw new Error('Expected --packet, --state, --output or --dry-run, once each');
      options[key] = key === '--dry-run' ? true : args[++i];
      if (!options[key]) throw new Error(`Missing value for ${key}`);
    }
    if (
      !input ||
      !options['--packet'] ||
      !options['--state'] ||
      (!options['--output'] && !options['--dry-run']) ||
      (options['--output'] && options['--dry-run'])
    )
      throw new Error(
        'Usage: content:import-sample RESPONSE.json --packet PACKET.json --state STATE.json (--output NEW_STATE.json | --dry-run)',
      );
    const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
    const result = importSampleCheck(readFileSync(input), {
      packet: read(options['--packet']),
      state: read(options['--state']),
    });
    if (options['--output'])
      writeFileSync(options['--output'], `${JSON.stringify(result.state, null, 2)}\n`, {
        flag: 'wx',
      });
    console.log(JSON.stringify(result.report, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
