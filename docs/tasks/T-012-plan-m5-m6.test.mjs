import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseFrontMatter, validateTasks } from '../../scripts/check-tasks.mjs';

const dir = new URL('./', import.meta.url);
const files = readdirSync(dir)
  .filter((file) => /^T-\d{3}-.+\.md$/.test(file))
  .map((file) => ({ file, text: readFileSync(new URL(file, dir), 'utf8') }));
const required = JSON.parse(readFileSync(new URL('required-refs.json', dir))).refs;
const backlog = validateTasks(files, required);
const byId = new Map(backlog.tasks.map((task) => [task.id, task]));
const bodies = new Map(
  files.map(({ text }) => {
    const parsed = parseFrontMatter(text);
    return [parsed.data.id, parsed.body];
  }),
);
const ids = Array.from({ length: 18 }, (_, index) => `T-${172 + index}`);
const tasks = ids.map((id) => byId.get(id));
const starters = ['T-172', 'T-173', 'T-174'];
const nativeIds = ['T-189'];

function criteria(body) {
  const section = /^## Acceptance criteria\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(body);
  assert.ok(section);
  return [...section[1].matchAll(/^- \[[ x]\] (.+(?:\n +.+)*)/gm)].map((m) => m[1]);
}
function primary(id) {
  const declaration = /Primary files: ([\s\S]*?)\.(?:\s|$)/.exec(bodies.get(id));
  assert.ok(declaration, id);
  return [...declaration[1].matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}
function ancestors(id, found = new Set()) {
  for (const parent of byId.get(id).dependsOn) {
    if (!found.has(parent)) {
      found.add(parent);
      ancestors(parent, found);
    }
  }
  return found;
}

test('T-012 AC1: every plan ref transfers to new ordinary tasks', () => {
  assert.deepEqual(backlog.errors, []);
  assert.deepEqual(backlog.uncoveredRefs, []);
  const plan = byId.get('T-012');
  assert.equal(plan.status, 'done');
  assert.ok(tasks.every(Boolean));
  const covered = new Set(tasks.flatMap((task) => task.refs));
  assert.deepEqual(
    plan.refs.filter((ref) => !covered.has(ref)),
    [],
  );
});

test('T-012 AC2: bounded vertical slices have observable typed test criteria', () => {
  for (const task of tasks) {
    assert.equal(task.type, 'task', task.id);
    assert.ok(['S', 'M'].includes(task.size), task.id);
    const body = bodies.get(task.id);
    assert.match(body, /## Goal\s+\n(?:A|An) (?:contributor|learner|Android learner) can/);
    assert.match(body, /Out \(do not do in this task\):/);
    assert.ok(criteria(body).length >= 3, task.id);
    for (const criterion of criteria(body)) {
      assert.match(criterion, /Given [\s\S]+when [\s\S]+then /i, task.id);
      assert.match(criterion, /\((?:unit|integration|e2e|device test)[^)]*\)/, task.id);
    }
  }
});

test('T-012 AC3: native adapter work is isolated with actual device criteria', () => {
  for (const task of tasks) {
    const body = bodies.get(task.id);
    if (nativeIds.includes(task.id)) {
      assert.match(body, /Native work: yes\./);
      assert.ok(criteria(body).some((ac) => /device test/.test(ac)));
      assert.ok(primary(task.id).some((path) => path.startsWith('e2e-android/')));
      assert.ok(primary(task.id).some((path) => path.startsWith('src/platform/android/')));
    } else {
      assert.match(body, /Native work: no\./);
      assert.ok(
        primary(task.id).every(
          (path) => !/^(android\/|e2e-android\/|src\/platform\/android\/)/.test(path),
        ),
      );
    }
  }
});

test('T-012 AC4: minimal valid graph allows three disjoint ready slices', () => {
  assert.deepEqual(backlog.errors, []);
  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      assert.ok(
        !task.dependsOn.some((other) => other !== dep && ancestors(other).has(dep)),
        `${task.id}: redundant ${dep}`,
      );
    }
  }
  const overlaps = (a, b) =>
    a === b || (a.endsWith('/') && b.startsWith(a)) || (b.endsWith('/') && a.startsWith(b));
  for (const id of starters) {
    assert.ok(
      byId.get(id).dependsOn.every((dep) => byId.get(dep).status === 'done'),
      id,
    );
    assert.match(bodies.get(id), /leave package manifests and shared barrels untouched/);
  }
  for (let i = 0; i < starters.length; i++) {
    for (let j = i + 1; j < starters.length; j++) {
      assert.ok(
        !primary(starters[i]).some((a) => primary(starters[j]).some((b) => overlaps(a, b))),
      );
    }
  }
});

test('T-012 handoff: reuse admitted content, compiler and native persistence', () => {
  for (const id of ['T-180', 'T-181', 'T-182', 'T-183', 'T-184', 'T-185', 'T-187', 'T-188']) {
    assert.ok(ancestors(id).has('T-120'), id);
    assert.ok(ancestors(id).has('T-129'), id);
  }
  assert.ok(ancestors('T-179').has('T-114'));
  assert.ok(ancestors('T-175').has('T-113'));
  assert.ok(ancestors('T-176').has('T-128'));
  assert.ok(ancestors('T-189').has('T-131'));
  assert.match(bodies.get('T-179'), /Reject executable payloads/);
  assert.match(bodies.get('T-186'), /concept versus active-task\/time budgets/);
});
