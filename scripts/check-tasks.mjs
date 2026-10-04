#!/usr/bin/env node
// Validates the task backlog in docs/tasks and prints which tasks are ready to start.
// Runs in CI as part of `npm run verify`, so a malformed task file fails the build.
//
//   node scripts/check-tasks.mjs                validate, print the ready queue and ref coverage
//   node scripts/check-tasks.mjs --strict-refs  also fail when a required ref has no task
//   node scripts/check-tasks.mjs --ledger       print the backlog as a Markdown ledger table
//   node scripts/check-tasks.mjs --json         machine-readable summary (used by agents)
//
// It also checks that ADR numbers in docs/adr are unique: tasks run in parallel, and two of them
// can each add "the next" ADR. CI then fails on whichever merges second, which renumbers its ADR.
//
// Optional traceability: a task's `refs: [W04, F13, T61]` front-matter list names the
// requirements/work packages/tests it implements. If docs/tasks/required-refs.json exists
// ({"refs": ["W01", ...]}), every listed ref must be covered by at least one task.
// A task with `type: plan` breaks part of the architecture down into tasks later: while it is open,
// its refs count as covered; once it is done, the tasks it created must cover them.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STATUSES = ['todo', 'in-progress', 'blocked', 'done'];
export const SIZES = ['S', 'M'];
export const TYPES = ['task', 'plan'];
const ID = /^T-\d{3}$/;
const REF = /^[A-Z]{1,4}\d{1,3}[a-z]?$/;

const unquote = (value) => value.replace(/^['"]|['"]$/g, '');

/**
 * Parses the small YAML subset used in task front matter: scalars, and lists written as `[a, b]`
 * (also spread over several indented lines, as Prettier formats long ones) or as `- a` lines.
 */
export function parseFrontMatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return null;
  const data = {};
  const lines = match[1].split(/\r?\n/).map((raw) => raw.replace(/\s+#.*$/, '').trimEnd());
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    const key = kv[1];
    let value = kv[2];
    if (value === '' || (value.startsWith('[') && !value.endsWith(']'))) {
      const more = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) more.push(lines[++i].trim());
      if (value === '' && more.length > 0 && more.every((line) => line.startsWith('- '))) {
        data[key] = more.map((line) => unquote(line.slice(2).trim())).filter(Boolean);
        continue;
      }
      value = [value, ...more].join(' ').trim();
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((item) => unquote(item.trim()))
        .filter(Boolean);
    } else {
      data[key] = unquote(value);
    }
  }
  return { data, body: text.slice(match[0].length) };
}

/** Returns the checkbox items under "## Acceptance criteria". */
export function acceptanceCriteria(body) {
  const section = /^## Acceptance criteria\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(body);
  if (!section) return [];
  return [...section[1].matchAll(/^\s*- \[( |x|X)\] (.+)$/gm)].map((m) => ({
    done: m[1] !== ' ',
    text: m[2].trim(),
  }));
}

/**
 * @param {{ file: string, text: string }[]} files
 * @param {string[]} [requiredRefs]
 */
export function validateTasks(files, requiredRefs = []) {
  const errors = [];
  const tasks = [];
  for (const { file, text } of files) {
    const parsed = parseFrontMatter(text);
    if (!parsed) {
      errors.push(`${file}: missing front matter (--- ... ---)`);
      continue;
    }
    const { data, body } = parsed;
    const where = `${file}:`;
    if (!ID.test(data.id ?? '')) errors.push(`${where} id must look like T-001`);
    else if (!file.startsWith(`${data.id}-`))
      errors.push(`${where} file name must start with "${data.id}-"`);
    if (!data.title) errors.push(`${where} title is required`);
    if (!STATUSES.includes(data.status))
      errors.push(`${where} status must be one of ${STATUSES.join(', ')}`);
    if (!SIZES.includes(data.size))
      errors.push(`${where} size must be S or M (split anything bigger into more tasks)`);
    if (!Array.isArray(data.depends_on))
      errors.push(`${where} depends_on must be a list, e.g. [] or [T-001]`);
    if (data.type !== undefined && !TYPES.includes(data.type))
      errors.push(`${where} type must be one of ${TYPES.join(', ')}`);
    if (data.refs !== undefined && !Array.isArray(data.refs))
      errors.push(`${where} refs must be a list, e.g. [W04, F13, T61]`);
    const refs = Array.isArray(data.refs) ? data.refs : [];
    for (const ref of refs) {
      if (!REF.test(ref)) errors.push(`${where} ref "${ref}" must look like W04, F13 or T61`);
    }
    const criteria = acceptanceCriteria(body);
    if (criteria.length === 0)
      errors.push(`${where} needs "## Acceptance criteria" with at least one "- [ ] ..." item`);
    if (data.status === 'done' && criteria.some((c) => !c.done))
      errors.push(`${where} status is done but not every acceptance criterion is checked`);
    tasks.push({
      file,
      id: data.id,
      title: data.title,
      type: data.type ?? 'task',
      status: data.status,
      size: data.size,
      dependsOn: Array.isArray(data.depends_on) ? data.depends_on : [],
      refs,
    });
  }

  const byId = new Map();
  for (const task of tasks) {
    if (!task.id) continue;
    if (byId.has(task.id)) errors.push(`${task.file}: duplicate id ${task.id}`);
    byId.set(task.id, task);
  }
  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      if (!byId.has(dep)) errors.push(`${task.file}: depends_on references unknown task ${dep}`);
    }
  }

  // Cycle detection (depth-first search).
  const state = new Map();
  const visit = (id, path) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'active') {
      errors.push(`dependency cycle: ${[...path, id].join(' -> ')}`);
      return;
    }
    state.set(id, 'active');
    for (const dep of byId.get(id)?.dependsOn ?? []) if (byId.has(dep)) visit(dep, [...path, id]);
    state.set(id, 'done');
  };
  for (const id of byId.keys()) visit(id, []);

  const ready = tasks
    .filter((t) => t.status === 'todo')
    .filter((t) => t.dependsOn.every((dep) => byId.get(dep)?.status === 'done'))
    .sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''));

  const isPlan = (t) => t.type === 'plan';
  const covered = new Set(
    tasks.filter((t) => !isPlan(t) || t.status !== 'done').flatMap((t) => t.refs),
  );
  const coveredByTasks = new Set(tasks.filter((t) => !isPlan(t)).flatMap((t) => t.refs));
  const uncoveredRefs = requiredRefs.filter((ref) => !covered.has(ref));
  const plannedOnlyRefs = requiredRefs.filter(
    (ref) => covered.has(ref) && !coveredByTasks.has(ref),
  );

  return { errors, tasks, ready, uncoveredRefs, plannedOnlyRefs };
}

/** Markdown ledger: one row per task with type, status, size, refs and dependencies. */
/** Errors for ADR files (`0004-title.md`) that share a number with another ADR. */
export function duplicateAdrNumbers(names) {
  const byNumber = new Map();
  for (const name of names) {
    const match = /^(\d{4})-.+\.md$/.exec(name);
    if (match) byNumber.set(match[1], [...(byNumber.get(match[1]) ?? []), name]);
  }
  return [...byNumber.values()]
    .filter((files) => files.length > 1)
    .map(
      (files) =>
        `docs/adr: ${files.join(' and ')} share a number; give the newer one the next free number`,
    );
}

export function ledgerMarkdown(tasks) {
  const rows = [...tasks]
    .sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''))
    .map(
      (t) =>
        `| ${t.id} | ${t.title} | ${t.type} | ${t.status} | ${t.size} | ${t.refs.join(', ') || '-'} | ${t.dependsOn.join(', ') || '-'} |`,
    );
  return [
    '| Task | Title | Type | Status | Size | Refs | Depends on |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

/** Reads and validates docs/tasks under `root` (also used by scripts/next-task.mjs). */
export function loadBacklog(root = process.cwd()) {
  const dir = join(root, 'docs', 'tasks');
  const files = readdirSync(dir)
    .filter((name) => /^T-\d{3}-.+\.md$/.test(name))
    .sort()
    .map((file) => ({ file, text: readFileSync(join(dir, file), 'utf8') }));
  const requiredPath = join(dir, 'required-refs.json');
  const requiredRefs = existsSync(requiredPath)
    ? JSON.parse(readFileSync(requiredPath, 'utf8')).refs
    : [];
  return { requiredRefs, result: validateTasks(files, requiredRefs) };
}

function main(argv) {
  const { requiredRefs, result } = loadBacklog();
  const adrDir = join(process.cwd(), 'docs', 'adr');
  if (existsSync(adrDir)) result.errors.push(...duplicateAdrNumbers(readdirSync(adrDir).sort()));
  const { errors, tasks, ready, uncoveredRefs, plannedOnlyRefs } = result;
  const strictRefs = argv.includes('--strict-refs');

  if (argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (argv.includes('--ledger')) {
    process.stdout.write(`${ledgerMarkdown(tasks)}\n`);
  } else {
    const counts = STATUSES.map((s) => `${s}: ${tasks.filter((t) => t.status === s).length}`);
    console.log(`Tasks: ${tasks.length} (${counts.join(', ')})`);
    console.log(
      ready.length
        ? `Ready to start: ${ready.map((t) => `${t.id} ${t.title}`).join(' | ')}`
        : 'Ready to start: none',
    );
    if (requiredRefs.length) {
      const notes = [
        uncoveredRefs.length ? `missing: ${uncoveredRefs.join(', ')}` : '',
        plannedOnlyRefs.length ? `${plannedOnlyRefs.length} only in open plan tasks` : '',
      ].filter(Boolean);
      console.log(
        `Required refs covered: ${requiredRefs.length - uncoveredRefs.length}/${requiredRefs.length}` +
          (notes.length ? ` (${notes.join('; ')})` : ''),
      );
    }
    for (const error of errors) console.error(`ERROR ${error}`);
    if (strictRefs && uncoveredRefs.length) {
      console.error(`ERROR required refs without a task: ${uncoveredRefs.join(', ')}`);
    }
  }
  if (errors.length || (strictRefs && uncoveredRefs.length)) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
