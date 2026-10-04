// This plan changes docs only. Run its executable acceptance evidence with:
// node --test docs/tasks/T-014-plan-m3-m4.test.mjs
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
const plan = backlog.tasks.find((task) => task.id === 'T-014');
// This plan reserves T-220–T-247 to avoid the concurrently claimed M5–M8 plans.
const allocatedIds = Array.from({ length: 28 }, (_, index) => `T-${220 + index}`);
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

test('T-014 AC1: completed plan hands every ref to new implementation tasks', () => {
  assert.ok(plan, 'T-014 exists');
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

test('T-014 AC2: every slice has an observable goal and Given/When/Then test criteria', () => {
  assert.ok(newTasks.length >= 3);
  for (const task of newTasks) {
    const body = documents.get(task.id);
    assert.ok(['S', 'M'].includes(task.size), `${task.id} must remain a small task`);
    assert.equal(task.type, 'task');
    assert.match(
      body,
      /## Goal\s+(?:A (?:contributor|learner|maintainer|PWA learner)|An Android learner|The owner)/,
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

test('T-014 AC3: native work is explicitly isolated and has device acceptance evidence', () => {
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

test('T-014 AC4: real acyclic dependencies leave three disjoint slices ready now', () => {
  assert.deepEqual(backlog.errors, [], 'Unknown dependencies and cycles fail validation');
  const starters = ['T-220', 'T-230', 'T-237'].map((id) => byId.get(id));
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
      /package manifests[\s\S]*untouched|package manifests may change only config\.playwrightBrowsers/,
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

test('T-014 risk contracts: staging, safe updates, scale and genuine platform evidence', () => {
  const proof = (id) => criteria(documents.get(id)).join(' ');
  assert.match(proof('T-221'), /interrupted.*checksum.*previous active pack/i);
  assert.match(proof('T-223'), /missing file.*previous pack stays active/i);
  assert.match(proof('T-225'), /no reload.*checkpoint/i);
  assert.match(proof('T-226'), /old tab.*no tab deletes/i);
  assert.match(proof('T-233'), /10,000 entries and 100,000/);
  assert.match(proof('T-235'), /cue identity.*historical evidence/);
  assert.match(proof('T-238'), /blocked.*API36 success never substitutes/);
  assert.match(proof('T-239'), /no physical phone.*blocker/);
  assert.match(proof('T-240'), /noncompliant ELF.*gate fails/);
  assert.match(proof('T-242'), /missing signing.*no install\/update\/release is falsely claimed/);
  assert.match(proof('T-243'), /1,946.*preserved original RU/);
  assert.match(proof('T-247'), /unfinished required task.*full-completion claim is rejected/);
});

test('T-014 ownership: implementation stays within docs and extends existing platform work', () => {
  const expectedNative = [
    'T-223',
    'T-228',
    'T-229',
    'T-232',
    'T-236',
    'T-238',
    'T-239',
    'T-240',
    'T-242',
  ];
  assert.deepEqual(
    newTasks
      .filter((task) => documents.get(task.id).includes('Native work: yes.'))
      .map((task) => task.id)
      .sort(),
    expectedNative,
  );
  assert.ok(byId.get('T-223').dependsOn.includes('T-135'));
  assert.ok(byId.get('T-229').dependsOn.includes('T-166'));
  assert.ok(byId.get('T-242').dependsOn.includes('T-167'));
  for (const id of ['T-238', 'T-240', 'T-241', 'T-242']) {
    assert.match(documents.get(id), /explicitly (?:permits|authorize|authorized)/);
  }
  // Shared feature work can start without waiting for a new native slice.
  for (const id of [
    'T-220',
    'T-221',
    'T-222',
    'T-224',
    'T-225',
    'T-226',
    'T-227',
    'T-230',
    'T-231',
    'T-233',
    'T-234',
    'T-235',
    'T-237',
    'T-241',
    'T-243',
  ]) {
    assert.ok(
      byId.get(id).dependsOn.every((dep) => !expectedNative.includes(dep)),
      id,
    );
  }
});
