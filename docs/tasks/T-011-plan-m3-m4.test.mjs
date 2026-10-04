// This plan changes docs only. Run its executable acceptance evidence with:
// node --test docs/tasks/T-011-plan-m3-m4.test.mjs
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseFrontMatter, validateTasks } from '../../scripts/check-tasks.mjs';

const dir = new URL('./', import.meta.url);
const files = readdirSync(dir)
  .filter((file) => /^T-\d{3}-.+\.md$/.test(file))
  .map((file) => ({ file, text: readFileSync(new URL(file, dir), 'utf8') }));
const requiredRefs = JSON.parse(readFileSync(new URL('required-refs.json', dir), 'utf8')).refs;
const backlog = validateTasks(files, requiredRefs);
const plan = backlog.tasks.find((task) => task.id === 'T-011');
// Later plans may allocate T-168 onward; only this plan's slices are inspected here.
const allocatedIds = Array.from({ length: 26 }, (_, index) => `T-${142 + index}`);
const newTasks = backlog.tasks.filter((task) => allocatedIds.includes(task.id));
const byId = new Map(backlog.tasks.map((task) => [task.id, task]));
const documents = new Map(
  files.map(({ text }) => {
    const parsed = parseFrontMatter(text);
    return [parsed.data.id, parsed.body];
  }),
);

function criteria(body) {
  const section = /^## Acceptance criteria\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(body);
  assert.ok(section, 'Acceptance criteria section is required');
  return [...section[1].matchAll(/^- \[[ x]\] (.+(?:\n +.+)*)/gm)].map((match) =>
    match[1].replace(/\s+/g, ' '),
  );
}

function primaryFiles(body) {
  const declaration = /Primary files: ([\s\S]*?)\.(?:\s|$)/.exec(body);
  assert.ok(declaration, 'Primary files declaration is required');
  return [...declaration[1].matchAll(/`([^`]+)`/g)].map((match) => match[1]);
}

function overlaps(a, b) {
  const within = (file, parent) =>
    file === parent || (parent.endsWith('/') && file.startsWith(parent));
  return within(a, b) || within(b, a);
}

test('T-011 AC1: completed plan hands every ref to new implementation tasks', () => {
  assert.ok(plan, 'T-011 exists');
  assert.equal(plan.status, 'done');
  assert.deepEqual(newTasks.map((task) => task.id).sort(), allocatedIds);
  assert.deepEqual(backlog.errors, []);
  assert.deepEqual(backlog.uncoveredRefs, []);
  const refs = new Set(
    newTasks.filter((task) => task.type === 'task').flatMap((task) => task.refs),
  );
  assert.deepEqual(
    plan.refs.filter((ref) => !refs.has(ref)),
    [],
    'Every plan ref needs a new task',
  );
  for (const task of newTasks) {
    assert.ok(!task.refs.some((ref) => ['W08', 'T31', 'T33', 'T34'].includes(ref)), task.id);
  }
});

test('T-011 AC2: every slice has an observable goal and Given/When/Then test criteria', () => {
  assert.ok(newTasks.length >= 3);
  for (const task of newTasks) {
    const body = documents.get(task.id);
    assert.ok(['S', 'M'].includes(task.size), `${task.id} must remain a small task`);
    assert.equal(task.type, 'task');
    assert.match(
      body,
      /## Goal\s+A (?:contributor|learner|maintainer|PWA learner|new learner)|## Goal\s+An? (?:Android learner|freshly installed)|## Goal\s+The owner/,
    );
    assert.match(body, /## Scope\s+In:/);
    assert.match(body, /Out \(do not do in this task\):/);
    const items = criteria(body);
    assert.ok(items.length > 0, task.id);
    for (const [index, item] of items.entries()) {
      assert.match(item, new RegExp(`^AC${index + 1}: Given .+, when .+, then .+`, 'i'), task.id);
      assert.match(
        item,
        /\((?:unit|integration|e2e|device test)(?: and (?:unit|integration|e2e|device test))*\)\.$/,
        task.id,
      );
    }
  }
});

test('T-011 AC3: native work is explicitly isolated and has device acceptance evidence', () => {
  const nativeTasks = [];
  for (const task of newTasks) {
    const body = documents.get(task.id);
    assert.match(body, /Native work: (yes|no)\./, task.id);
    const native = body.includes('Native work: yes.');
    if (native) {
      nativeTasks.push(task.id);
      assert.ok(
        criteria(body).some((item) => item.includes('device test')),
        task.id,
      );
      assert.ok(
        primaryFiles(body).some((file) => file.startsWith('e2e-android/')),
        task.id,
      );
    } else {
      assert.ok(
        primaryFiles(body).every(
          (file) =>
            !/^(android\/|e2e-android\/|src\/(platform|infrastructure\/db)\/android\/)/.test(file),
        ),
        `${task.id} must not own native implementation`,
      );
    }
  }
  assert.ok(nativeTasks.length > 0, 'The plan must actually allocate its native work');
});

test('T-011 AC4: real acyclic dependencies leave three disjoint slices ready now', () => {
  assert.deepEqual(backlog.errors, [], 'Unknown dependencies and cycles fail validation');
  const starters = ['T-142', 'T-143', 'T-144'].map((id) => byId.get(id));
  for (const task of starters) {
    assert.ok(task, 'Each named parallel starter must exist');
    assert.ok(
      ['done', 'in-progress'].includes(task.status) ||
        backlog.ready.some((ready) => ready.id === task.id),
      `${task.id} must be ready or already started`,
    );
    assert.ok(
      task.dependsOn.every((id) => byId.get(id).status === 'done'),
      task.id,
    );
    assert.ok(primaryFiles(documents.get(task.id)).length > 0);
    assert.match(
      documents.get(task.id),
      /package manifests[\s\S]*untouched|package manifests[\s\S]*do not edit|do not edit package[\s\S]*manifests/,
    );
  }
  for (let i = 0; i < starters.length; i++) {
    for (let j = i + 1; j < starters.length; j++) {
      const left = primaryFiles(documents.get(starters[i].id));
      const right = primaryFiles(documents.get(starters[j].id));
      assert.ok(
        !left.some((a) => right.some((b) => overlaps(a, b))),
        'Parallel file ownership must be disjoint',
      );
    }
  }
  // A dependency already implied by another prerequisite only serializes the queue unnecessarily.
  function ancestors(id, found = new Set()) {
    for (const parent of byId.get(id).dependsOn) {
      if (!found.has(parent)) {
        found.add(parent);
        ancestors(parent, found);
      }
    }
    return found;
  }
  for (const task of newTasks) {
    for (const dep of task.dependsOn) {
      assert.ok(
        !task.dependsOn.some((other) => other !== dep && ancestors(other).has(dep)),
        `${task.id} has a redundant dependency on ${dep}`,
      );
    }
  }
});

test('T-011 handoff: starter study depends on actual admission and existing repositories', () => {
  function ancestors(id, found = new Set()) {
    for (const parent of byId.get(id).dependsOn) {
      if (!found.has(parent)) {
        found.add(parent);
        ancestors(parent, found);
      }
    }
    return found;
  }
  const studyTasks = newTasks.filter((task) =>
    documents.get(task.id).includes('Starter study: yes.'),
  );
  assert.ok(studyTasks.length >= 12, 'The everyday/native learning flow must be allocated');
  for (const task of studyTasks) {
    assert.ok(ancestors(task.id).has('T-120'), `${task.id} needs actual reviewed admission`);
    assert.ok(ancestors(task.id).has('T-129'), `${task.id} must reuse production learning writes`);
  }
  assert.ok(
    byId.get('T-142').dependsOn.includes('T-123'),
    'Adapter reuses existing scheduler validation',
  );
  assert.ok(byId.get('T-148').dependsOn.includes('T-120'));
  assert.ok(byId.get('T-155').dependsOn.includes('T-110'), 'Typed judgments reuse entry contracts');
  assert.ok(byId.get('T-163').dependsOn.includes('T-131'), 'Reuse native lifecycle and SQLite');
  assert.ok(byId.get('T-165').dependsOn.includes('T-141'), 'Family release needs verified backups');
  assert.ok(byId.get('T-165').dependsOn.includes('T-158'), 'Release includes workload adaptation');
});

test('T-011 isolation: shared web slices do not wait on new native work', () => {
  const nativeIds = new Set(
    newTasks
      .filter((task) => documents.get(task.id).includes('Native work: yes.'))
      .map((task) => task.id),
  );
  assert.deepEqual([...nativeIds].sort(), ['T-163', 'T-164', 'T-165', 'T-166', 'T-167']);
  for (const task of newTasks.filter((task) => !nativeIds.has(task.id))) {
    assert.ok(
      !task.dependsOn.some((id) => nativeIds.has(id)),
      `${task.id} waits unnecessarily for native work`,
    );
  }
});

test('T-011 risk contracts: cap, clock, evidence, replay and release blockers are observable', () => {
  assert.match(
    criteria(documents.get('T-142')).join(' '),
    /365\/366\/367-day[\s\S]*never exceed 365/,
  );
  assert.match(criteria(documents.get('T-150')).join(' '), /actual captured grading time/);
  assert.match(
    criteria(documents.get('T-146')).join(' '),
    /two later study days[\s\S]*six elapsed hours/,
  );
  assert.match(
    criteria(documents.get('T-153')).join(' '),
    /earlier grade and subsequent reviews[\s\S]*replay/,
  );
  assert.match(
    criteria(documents.get('T-164')).join(' '),
    /networking disabled before first launch/,
  );
  assert.match(
    criteria(documents.get('T-165')).join(' '),
    /missing binding[\s\S]*no artifact labelled signed or released/,
  );
  assert.match(
    criteria(documents.get('T-166')).join(' '),
    /no preceding signed baseline[\s\S]*unexecuted upgrade/,
  );
  assert.match(
    criteria(documents.get('T-167')).join(' '),
    /missing Console credentials[\s\S]*no public\/track release/,
  );
});
