import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, payloadHash, pointerValue } from './validate-entry.mjs';
import { exerciseFindings } from './exercise-rules.mjs';

/** Apply the committed authored fixes without changing the original research evidence. */
export function preparePilot(original, changes) {
  const pilot = structuredClone(original);
  pilot.version = 'starter-rules-1';
  const report = [];
  const archivedForms = [];
  for (const entry of pilot.entries) {
    const before = original.entries.find((e) => e.id === entry.id);
    const patches = changes[entry.fixture_ref] ?? [];
    for (const { op, path, value, rule } of patches) {
      if (
        !['R1', 'R2', 'R3', 'R4', 'R5'].includes(rule) ||
        !['add', 'remove', 'replace'].includes(op)
      )
        throw new Error('Invalid exercise patch');
      const index = path.lastIndexOf('/');
      const parent = pointerValue(entry, path.slice(0, index));
      const key = path.slice(index + 1);
      if (!parent || (op !== 'add' && !Object.hasOwn(parent, key)))
        throw new Error(`Missing patch target ${path}`);
      if (op === 'remove' && /^\/forms\/\d+$/.test(path)) {
        const form = pointerValue(entry, path);
        if (!/^[-–—]+$/.test(form.surface.trim())) throw new Error('Cannot remove attested forms');
        archivedForms.push({
          entry_id: entry.id,
          rule,
          reason: 'source_table_placeholder',
          form: structuredClone(form),
        });
      }
      if (Array.isArray(parent)) {
        const position = key === '-' ? parent.length : Number(key);
        if (!Number.isSafeInteger(position) || position < 0 || position > parent.length)
          throw new Error('Invalid array patch');
        if (op === 'remove') parent.splice(position, 1);
        else if (op === 'add') parent.splice(position, 0, structuredClone(value));
        else parent[position] = structuredClone(value);
      } else if (op === 'remove') delete parent[key];
      else parent[key] = structuredClone(value);
    }
    if (exerciseFindings(entry).length)
      throw new Error(`Unresolved exercise rules ${entry.fixture_ref}`);
    if (patches.length) {
      entry.revision++;
      entry.review.statuses.language_check = 'not_run';
      entry.review.statuses.ai_review = 'not_run';
      entry.review.statuses.release = 'blocked';
      entry.content_sha256 = payloadHash(entry);
      entry.review.verification_log.push({
        stage: 'exercise_rule_authoring',
        actor: 'OpenAI Codex',
        verdict: 'revised_draft',
        independent: false,
        content_sha256: entry.content_sha256,
        rules: [...new Set(patches.map((p) => p.rule))],
      });
    }
    report.push({
      id: entry.id,
      fixture_ref: entry.fixture_ref,
      changed: patches.length > 0,
      rules: [...new Set(patches.map((p) => p.rule))],
      old_hash: before.content_sha256,
      new_hash: entry.content_sha256,
      language_check: 'not_run',
      patches: structuredClone(patches),
    });
  }
  const generation = {
    vendor: 'OpenAI',
    model: null,
    version: null,
    run_ref: 'T-169 committed exercise-rule authoring',
    prompt_sha256: null,
    input_sha256: digest(original),
    output_sha256: digest(pilot),
  };
  return {
    pilot,
    batch: {
      schema_version: 'woorden-draft-batch-1',
      batch_id: 'woorden-starter-rules-1',
      generation: Object.fromEntries(
        Object.entries(generation).filter(([key]) => key !== 'output_sha256'),
      ),
      entries: pilot.entries,
    },
    report: {
      generation,
      total: report.length,
      changed: report.filter((r) => r.changed).length,
      entries: report,
      archived_forms: archivedForms,
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
  const result = preparePilot(
    read('research/content-2026-10/content/starter-pack.json'),
    read('content/pilot/exercise-patches.json'),
  );
  for (const name of ['pilot', 'batch', 'report']) {
    const output = `content/pilot/${name}.json`;
    if (process.argv[2] === '--check') {
      if (digest(read(output)) !== digest(result[name])) throw new Error(`Stale ${output}`);
    } else if (process.argv[2] === '--write')
      writeFileSync(output, `${JSON.stringify(result[name], null, 2)}\n`);
    else throw new Error('Usage: node tools/content/prepare-pilot.mjs --write|--check');
  }
}
