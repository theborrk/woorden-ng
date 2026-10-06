import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const root = fileURLToPath(new URL('../../', import.meta.url));
const pins = JSON.parse(
  readFileSync(new URL('./sources/legacy-audit.json', import.meta.url), 'utf8'),
);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const jsonHash = (value) => digest(JSON.stringify(value));
const clone = (value) => structuredClone(value);
const actions = { keep: 'keep', fix: 'fix', 'move to opt-in': 'opt_in', drop: 'drop_as_alias' };

// Strict CSV quoting, including commas, escaped quotes and newlines inside quoted fields.
export function parseAuditCsv(text) {
  const rows = [];
  let row = [],
    field = '',
    quoted = false,
    closed = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char !== '"') field += char;
      else if (text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = false;
        closed = true;
      }
    } else if (char === '"') {
      if (field || closed) throw new Error('Invalid CSV quote.');
      quoted = true;
    } else if (char === ',' || char === '\n' || char === '\r') {
      row.push(field);
      field = '';
      closed = false;
      if (char !== ',') {
        if (char === '\r' && text[i + 1] === '\n') i += 1;
        rows.push(row);
        row = [];
      }
    } else {
      if (closed) throw new Error('Unexpected text after CSV quote.');
      field += char;
    }
  }
  if (quoted) throw new Error('Unterminated CSV quote.');
  if (field || closed || row.length) rows.push([...row, field]);
  const header = ['legacyId', 'nl', 'decision', 'problem', 'proposed fix', 'source'];
  if (!isDeepStrictEqual(rows.shift(), header)) throw new Error('Invalid audit CSV header.');
  return rows.map((values) => {
    if (values.length !== header.length) throw new Error('Invalid audit CSV row.');
    return Object.fromEntries(header.map((name, i) => [name, values[i]]));
  });
}

function indexRecords(records, label) {
  if (!Array.isArray(records) || records.length !== 1946)
    throw new Error(`${label}: expected 1,946 records.`);
  const map = new Map();
  for (const record of records) {
    if (
      !record ||
      !/^s(?:0|[1-9]\d*)$/.test(record.legacyId ?? '') ||
      Number(record.legacyId.slice(1)) > 1945 ||
      map.has(record.legacyId)
    )
      throw new Error(`${label}: invalid or duplicate legacy ID.`);
    map.set(record.legacyId, record);
  }
  return map;
}

export function importLegacyAudit(inputs, expected = pins) {
  const sources = Object.fromEntries(
    ['seed', 'csv', 'evidence'].map((name) => {
      const bytes = inputs[name];
      if (
        !bytes ||
        bytes.length !== expected[name]?.bytes ||
        digest(bytes) !== expected[name]?.sha256
      )
        throw new Error(`Audit ${name} integrity mismatch.`);
      return [name, clone(expected[name])];
    }),
  );
  const decode = (name) => new TextDecoder('utf-8', { fatal: true }).decode(inputs[name]);
  const seed = JSON.parse(decode('seed'));
  const originals = indexRecords(seed.entries, 'Seed');
  const csvRows = parseAuditCsv(decode('csv'));
  const evidenceRows = JSON.parse(decode('evidence'));
  const csv = indexRecords(csvRows, 'CSV');
  const evidence = indexRecords(evidenceRows, 'Evidence');
  const entries = [...originals.values()]
    .map((original) => {
      const id = original.legacyId,
        row = csv.get(id),
        detail = evidence.get(id);
      if (
        !isDeepStrictEqual(original, detail.original) ||
        row.nl !== original.nl ||
        row.decision !== detail.decision ||
        !Object.hasOwn(actions, row.decision)
      )
        throw new Error(`Audit/source disagreement at ${id}.`);
      const candidates = [
        ...new Set((detail.checks?.article_observations ?? []).flatMap((o) => o.articles)),
      ].sort();
      if (candidates.some((a) => !['de', 'het'].includes(a)))
        throw new Error(`Invalid article evidence at ${id}.`);
      const proposal = {
        action: actions[row.decision],
        candidate_pack: detail.pack,
        problem: row.problem,
        proposed_fix: row['proposed fix'],
        proposed_pos: detail.proposed_pos,
        noun_verb_contamination: original.pos === 'zn' && original.conjugation !== null,
        article: {
          original: original.article,
          candidates,
          status: !original.article
            ? 'not_applicable'
            : candidates.length > 1
              ? 'alternatives_need_scope'
              : !candidates.length
                ? 'missing'
                : candidates.includes(original.article)
                  ? 'supported_at_lemma_level'
                  : 'conflict_needs_scope',
          unconditional_error: false,
          warning: detail.checks?.article_warning ?? null,
        },
      };
      return {
        legacyId: id,
        original: clone(original),
        research_csv: row,
        research_evidence: detail,
        provenance: {
          csv_logical_record: csvRows.indexOf(row) + 2,
          csv_record_sha256: jsonHash(row),
          evidence_array_index: evidenceRows.indexOf(detail),
          evidence_record_sha256: jsonHash(detail),
        },
        proposal,
        proposal_sha256: jsonHash({ original, row, detail, proposal }),
        assessment: {
          annotation_review: 'not_run',
          source_evidence: 'research_assertions_only',
          language_check: 'not_run',
          release: 'blocked',
        },
      };
    })
    .sort((a, b) => Number(a.legacyId.slice(1)) - Number(b.legacyId.slice(1)));
  const coverage = {
    total: entries.length,
    original_ru_preserved: entries.length,
    actions: Object.fromEntries(
      Object.values(actions).map((action) => [
        action,
        entries.filter((e) => e.proposal.action === action).length,
      ]),
    ),
    annotation_reviewed: 0,
    language_checked: 0,
    release_eligible: 0,
  };
  const audit = { schema_version: 'woorden-legacy-audit-1', sources, entries, coverage };
  return { ...audit, audit_sha256: jsonHash(audit) };
}

function checkAudit(audit) {
  const { audit_sha256, ...payload } = audit;
  if (audit.schema_version !== 'woorden-legacy-audit-1' || jsonHash(payload) !== audit_sha256)
    throw new Error('Changed or incompatible audit artifact.');
}

function seal(state) {
  return { ...state, state_sha256: jsonHash(state) };
}
export function emptyAnnotations(audit) {
  checkAudit(audit);
  return seal({
    schema_version: 'woorden-legacy-annotations-1',
    audit_sha256: audit.audit_sha256,
    annotations: {},
    history: [],
  });
}
function checkState(audit, state) {
  checkAudit(audit);
  const { state_sha256, ...payload } = state;
  if (
    state.schema_version !== 'woorden-legacy-annotations-1' ||
    state.audit_sha256 !== audit.audit_sha256 ||
    !state.annotations ||
    !Array.isArray(state.history) ||
    jsonHash(payload) !== state_sha256
  )
    throw new Error('Changed, incompatible or stale annotation state.');
  return clone(payload);
}

// A supplied acceptance receipt authorizes only a sidecar annotation, never curated release.
export function applyAnnotation(audit, state, receipt) {
  const next = checkState(audit, state);
  const entry = audit.entries.find((e) => e.legacyId === receipt?.legacyId);
  if (
    !entry ||
    receipt.proposal_sha256 !== entry.proposal_sha256 ||
    receipt.verdict !== 'accept' ||
    !['reviewer', 'run_ref'].every((key) => typeof receipt[key] === 'string' && receipt[key].trim())
  )
    throw new Error('Expected a hash-bound annotation acceptance receipt.');
  const annotation = {
    proposal_sha256: entry.proposal_sha256,
    proposal: clone(entry.proposal),
    receipt: clone(receipt),
    annotation_review: 'accepted_by_supplied_receipt',
    language_check: 'not_run',
    release: 'blocked',
  };
  const prior = next.annotations[entry.legacyId] ?? null;
  if (isDeepStrictEqual(prior, annotation)) return clone(state);
  next.history.push({
    sequence: next.history.length + 1,
    action: 'apply',
    legacyId: entry.legacyId,
    prior,
    next: annotation,
  });
  next.annotations[entry.legacyId] = annotation;
  return seal(next);
}

export function undoAnnotation(audit, state, id) {
  const next = checkState(audit, state);
  const undone = new Set(
    next.history.filter((e) => e.action === 'undo').map((e) => e.target_sequence),
  );
  const event = next.history.findLast(
    (e) => e.action === 'apply' && e.legacyId === id && !undone.has(e.sequence),
  );
  if (!event || !isDeepStrictEqual(next.annotations[id], event.next))
    throw new Error('No current annotation application to undo.');
  if (event.prior === null) delete next.annotations[id];
  else next.annotations[id] = clone(event.prior);
  next.history.push({
    sequence: next.history.length + 1,
    action: 'undo',
    legacyId: id,
    target_sequence: event.sequence,
  });
  return seal(next);
}

export function run(args = process.argv.slice(2)) {
  const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
  let artifact, report, output;
  if (args[0] === 'import') {
    const options = {};
    for (let i = 1; i < args.length; i += 2) {
      if (!['--id', '--output'].includes(args[i]) || !args[i + 1] || options[args[i]])
        throw new Error('Invalid audit import arguments.');
      options[args[i]] = args[i + 1];
    }
    artifact = importLegacyAudit(
      Object.fromEntries(
        Object.entries(pins).map(([key, pin]) => [key, readFileSync(resolve(root, pin.path))]),
      ),
    );
    report = {
      sources: artifact.sources,
      audit_sha256: artifact.audit_sha256,
      coverage: artifact.coverage,
    };
    if (options['--id']) {
      report.entry = artifact.entries.find((e) => e.legacyId === options['--id']);
      if (!report.entry) throw new Error('Unknown legacy ID.');
    }
    output = options['--output'];
  } else if (['apply', 'undo'].includes(args[0]) && args.length === 6 && args[4] === '--output') {
    const audit = read(args[1]);
    const state = args[2] === '-' ? emptyAnnotations(audit) : read(args[2]);
    artifact =
      args[0] === 'apply'
        ? applyAnnotation(audit, state, read(args[3]))
        : undoAnnotation(audit, state, args[3]);
    report = {
      state_sha256: artifact.state_sha256,
      annotations: Object.keys(artifact.annotations).length,
      history_events: artifact.history.length,
    };
    output = args[5];
  } else
    throw new Error(
      'Usage: content:legacy-audit -- import [--id s295] [--output new.json] | apply <audit> <state|-> <receipt> --output <new> | undo <audit> <state> <id> --output <new>',
    );
  if (output) writeFileSync(output, `${JSON.stringify(artifact, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
