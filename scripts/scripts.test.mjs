// @vitest-environment node
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { debugVersion, releaseVersion } from './android-version.mjs';
import {
  acceptanceCriteria,
  ledgerMarkdown,
  parseFrontMatter,
  validateTasks,
} from './check-tasks.mjs';
import { escapeHtml, galleryHtml } from './review-gallery.mjs';
import { renameApp, validateAppId } from './rename-app.mjs';
import gate from './lib/review-gate.cjs';
import orchestrator from './lib/orchestrator.cjs';

const SHA = 'a'.repeat(40);

describe('android-version', () => {
  it('maps release tags to monotonically increasing codes', () => {
    expect(releaseVersion('v1.2.3')).toEqual({ versionCode: 1002003, versionName: '1.2.3' });
    expect(releaseVersion('0.1.0').versionCode).toBe(1000);
    expect(releaseVersion('v1.10.0').versionCode).toBeGreaterThan(
      releaseVersion('v1.9.99').versionCode,
    );
  });

  it('rejects pre-release, malformed and empty tags', () => {
    expect(() => releaseVersion('v1.0.0-beta.1')).toThrow(/pre-release/);
    expect(() => releaseVersion('latest')).toThrow();
    expect(() => releaseVersion('v0.0.0')).toThrow();
    expect(() => releaseVersion('v1.1000.0')).toThrow(/range/);
  });

  it('gives debug builds an increasing, time-based code', () => {
    const earlier = debugVersion(new Date('2026-10-01T10:00:00Z'), 'main.abc1234');
    const later = debugVersion(new Date('2026-10-01T10:01:00Z'));
    expect(later.versionCode).toBe(earlier.versionCode + 1);
    expect(earlier.versionName).toBe('main.abc1234');
    expect(later.versionCode).toBeLessThan(2_100_000_000);
  });
});

describe('check-tasks', () => {
  const task = (id, { status = 'todo', deps = '[]', ac = '- [ ] It works', size = 'S' } = {}) => ({
    file: `${id}-example.md`,
    text: `---\nid: ${id}\ntitle: Example ${id}\nstatus: ${status}\nsize: ${size}\ndepends_on: ${deps}\n---\n\n## Goal\nx\n\n## Acceptance criteria\n${ac}\n\n## Notes\n- not a criterion\n`,
  });

  it('parses front matter and acceptance criteria', () => {
    const { data, body } = parseFrontMatter(task('T-001', { deps: '[T-000, T-002]' }).text);
    expect(data).toMatchObject({ id: 'T-001', status: 'todo', depends_on: ['T-000', 'T-002'] });
    expect(acceptanceCriteria(body)).toEqual([{ done: false, text: 'It works' }]);
  });

  it('reads lists spread over several lines and block lists', () => {
    const text = [
      '---',
      'id: T-001',
      'refs:',
      '  [',
      '    W10,',
      '    T61, # trailing comment',
      '  ]',
      'depends_on:',
      '  - T-002',
      "  - 'T-003'",
      'title: After the lists',
      '---',
      '',
    ].join('\n');
    expect(parseFrontMatter(text)?.data).toEqual({
      id: 'T-001',
      refs: ['W10', 'T61'],
      depends_on: ['T-002', 'T-003'],
      title: 'After the lists',
    });
  });

  it('accepts a valid backlog and computes the ready queue', () => {
    const result = validateTasks([
      task('T-001', { status: 'done', ac: '- [x] Done' }),
      task('T-002', { deps: '[T-001]' }),
      task('T-003', { deps: '[T-002]' }),
    ]);
    expect(result.errors).toEqual([]);
    expect(result.ready.map((t) => t.id)).toEqual(['T-002']);
  });

  it('reports structural problems', () => {
    const result = validateTasks([
      task('T-001', { deps: '[T-009]' }),
      task('T-002', { size: 'L' }),
      task('T-003', { ac: 'no checkbox here' }),
      task('T-004', { status: 'done' }),
      { file: 'T-005-x.md', text: 'no front matter' },
    ]);
    const all = result.errors.join('\n');
    expect(all).toMatch(/unknown task T-009/);
    expect(all).toMatch(/size must be S or M/);
    expect(all).toMatch(/Acceptance criteria/);
    expect(all).toMatch(/not every acceptance criterion is checked/);
    expect(all).toMatch(/missing front matter/);
  });

  it('tracks refs, reports uncovered required refs and renders a ledger', () => {
    const withRefs = (id, refs) => {
      const t = task(id);
      return { ...t, text: t.text.replace('depends_on: []', `depends_on: []\nrefs: ${refs}`) };
    };
    const result = validateTasks(
      [withRefs('T-001', '[W01, T61]'), withRefs('T-002', '[W02]')],
      ['W01', 'W02', 'W03'],
    );
    expect(result.errors).toEqual([]);
    expect(result.uncoveredRefs).toEqual(['W03']);
    expect(ledgerMarkdown(result.tasks)).toContain(
      '| T-001 | Example T-001 | task | todo | S | W01, T61 | - |',
    );
    const bad = validateTasks([withRefs('T-003', '[w1]')]);
    expect(bad.errors.join('\n')).toMatch(/ref "w1"/);
  });

  it('counts refs of open plan tasks as covered until the plan is done', () => {
    const plan = (status, ac) => {
      const t = task('T-001', { status, ac });
      return {
        ...t,
        text: t.text.replace('depends_on: []', 'depends_on: []\ntype: plan\nrefs: [W10, W11]'),
      };
    };
    const work = (() => {
      const t = task('T-002');
      return { ...t, text: t.text.replace('depends_on: []', 'depends_on: []\nrefs: [W10]') };
    })();

    const open = validateTasks([plan('todo', '- [ ] Planned'), work], ['W10', 'W11']);
    expect(open.errors).toEqual([]);
    expect(open.uncoveredRefs).toEqual([]);
    expect(open.plannedOnlyRefs).toEqual(['W11']);

    const done = validateTasks([plan('done', '- [x] Planned'), work], ['W10', 'W11']);
    expect(done.uncoveredRefs).toEqual(['W11']);

    const badType = validateTasks([
      { ...work, text: work.text.replace('refs: [W10]', 'refs: [W10]\ntype: epic') },
    ]);
    expect(badType.errors.join('\n')).toMatch(/type must be one of task, plan/);
  });

  it('detects dependency cycles', () => {
    const result = validateTasks([
      task('T-001', { deps: '[T-002]' }),
      task('T-002', { deps: '[T-001]' }),
    ]);
    expect(result.errors.join('\n')).toMatch(/dependency cycle/);
  });
});

describe('review-gate', () => {
  const comment = (body, overrides = {}) => ({
    body,
    author_association: 'OWNER',
    user: { login: 'owner', type: 'User' },
    ...overrides,
  });
  const marker = (verdict, sha = SHA, round = 1) =>
    `Summary...\n<!-- claude-review:v1 verdict=${verdict} sha=${sha} round=${round} -->`;

  it('parses the verdict marker', () => {
    expect(gate.parseVerdict(marker('approve'))).toEqual({
      verdict: 'approve',
      sha: SHA,
      round: 1,
    });
    expect(gate.parseVerdict('no marker')).toBeNull();
  });

  it('sets success for an approval of the current head', () => {
    const decision = gate.decide(comment(marker('approve')), SHA);
    expect(decision).toMatchObject({ action: 'set', state: 'success' });
    expect(decision.labelsToRemove).toContain('needs-claude-review');
  });

  it('sets failure when changes are requested', () => {
    expect(gate.decide(comment(marker('changes', SHA, 2)), SHA)).toMatchObject({
      action: 'set',
      state: 'failure',
      description: 'Claude requested changes (round 2)',
    });
  });

  it('ignores stale reviews and untrusted authors', () => {
    expect(gate.decide(comment(marker('approve')), 'b'.repeat(40)).action).toBe('skip');
    const bot = comment(marker('approve'), {
      author_association: 'NONE',
      user: { login: 'chatgpt-codex-connector[bot]', type: 'Bot' },
    });
    expect(gate.decide(bot, SHA)).toMatchObject({ action: 'skip' });
    const contributor = comment(marker('approve'), { author_association: 'CONTRIBUTOR' });
    expect(gate.decide(contributor, SHA).action).toBe('skip');
  });
});

describe('review-gallery', () => {
  it('escapes file names and titles', () => {
    expect(escapeHtml('<a href="x">')).toBe('&lt;a href=&quot;x&quot;&gt;');
    const html = galleryHtml('PR #1 <test>', ['mobile--home.png']);
    expect(html).toContain('PR #1 &lt;test&gt;');
    expect(html).toContain('src="mobile--home.png"');
  });
});

describe('rename-app', () => {
  let dir;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('validates application IDs', () => {
    expect(validateAppId('nl.example.groceries')).toBeNull();
    expect(validateAppId('Groceries')).toMatch(/reverse-domain/);
    expect(validateAppId('nl.new.app')).toMatch(/Java keyword/);
  });

  it('renames the web, Capacitor and Android identity consistently', () => {
    dir = mkdtempSync(join(tmpdir(), 'rename-'));
    for (const file of ['app.config.ts', 'capacitor.config.ts', 'package.json']) {
      cpSync(file, join(dir, file));
    }
    cpSync('android/app/build.gradle', join(dir, 'android/app/build.gradle'));
    cpSync('android/app/src/main', join(dir, 'android/app/src/main'), { recursive: true });

    const changed = renameApp(dir, { id: 'nl.example.groceries', name: "Bart's & Co" });
    expect(changed.length).toBeGreaterThanOrEqual(5);

    const read = (file) => readFileSync(join(dir, file), 'utf8');
    expect(read('app.config.ts')).toContain("id: 'nl.example.groceries'");
    expect(read('app.config.ts')).toContain("name: 'Bart\\'s & Co'");
    expect(read('capacitor.config.ts')).toContain("appId: 'nl.example.groceries'");
    expect(JSON.parse(read('package.json')).name).toBe('bart-s-co');
    expect(read('android/app/build.gradle')).toContain('applicationId "nl.example.groceries"');
    expect(read('android/app/build.gradle')).toContain('namespace = "nl.example.groceries"');
    expect(read('android/app/src/main/res/values/strings.xml')).toContain(
      '<string name="app_name">Bart\'s &amp; Co</string>',
    );
    const activity = 'android/app/src/main/java/nl/example/groceries/MainActivity.java';
    expect(read(activity)).toMatch(/^package nl\.example\.groceries;/);
    expect(existsSync(join(dir, 'android/app/src/main/java/com'))).toBe(false);
  });
});

describe('orchestrator', () => {
  const ready = {
    config: { autoMerge: true },
    pr: { state: 'open', draft: false, mergeable: true, author: 'owner' },
    labels: ['claude-approved'],
    ciOk: 'success',
    claudeReview: 'success',
    behindBy: 0,
  };

  it('merges only a green, approved, up-to-date pull request', () => {
    expect(orchestrator.mergeDecision(ready).action).toBe('merge');
    const variants = [
      { config: { autoMerge: false } },
      { pr: { ...ready.pr, draft: true } },
      { labels: ['claude-approved', 'hold'] },
      { labels: ['needs-human'] },
      { ciOk: 'failure' },
      { ciOk: null },
      { claudeReview: 'pending' },
      { pr: { ...ready.pr, author: 'dependabot[bot]' } },
    ];
    for (const variant of variants) {
      expect(orchestrator.mergeDecision({ ...ready, ...variant }).action).toBe('wait');
    }
  });

  it('updates a branch that is behind and reports conflicts', () => {
    expect(orchestrator.mergeDecision({ ...ready, behindBy: 2 }).action).toBe('update');
    const conflicted = { ...ready, pr: { ...ready.pr, mergeable: false } };
    expect(orchestrator.mergeDecision(conflicted).action).toBe('conflict');
    const dependabot = {
      ...ready,
      config: { autoMerge: true, autoMergeDependabot: true },
      pr: { ...ready.pr, author: 'dependabot[bot]' },
    };
    expect(orchestrator.mergeDecision(dependabot).action).toBe('merge');
  });

  it('carries an approval over a GitHub-made update from the base branch only', () => {
    const update = {
      parentCount: 2,
      committerLogin: 'web-flow',
      verified: true,
      firstParentApproved: true,
      secondParentOnBase: true,
    };
    expect(orchestrator.canCarryOverApproval(update)).toBe(true);
    expect(orchestrator.canCarryOverApproval({ ...update, committerLogin: 'codex' })).toBe(false);
    expect(orchestrator.canCarryOverApproval({ ...update, parentCount: 1 })).toBe(false);
    expect(orchestrator.canCarryOverApproval({ ...update, verified: false })).toBe(false);
    expect(orchestrator.canCarryOverApproval({ ...update, firstParentApproved: false })).toBe(
      false,
    );
    expect(orchestrator.canCarryOverApproval({ ...update, secondParentOnBase: false })).toBe(false);
  });

  it('asks Codex to fix CI failures until the round limit', () => {
    const config = { codexAutoFix: true, maxReviewRounds: 3 };
    expect(orchestrator.ciFailureAction(config, { hasToken: true, earlierRequests: 0 })).toBe(
      'mention',
    );
    expect(orchestrator.ciFailureAction(config, { hasToken: true, earlierRequests: 3 })).toBe(
      'needs-human',
    );
    expect(orchestrator.ciFailureAction(config, { hasToken: false, earlierRequests: 0 })).toBe(
      'none',
    );
    expect(
      orchestrator.ciFailureAction({ codexAutoFix: false }, { hasToken: true, earlierRequests: 0 }),
    ).toBe('none');
  });
});
