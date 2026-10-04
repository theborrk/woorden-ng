#!/usr/bin/env node
// Picks the next task for a Codex worker (docs/agents/codex-worker.md), so several workers can pull
// from the backlog without taking the same task.
//
//   node scripts/next-task.mjs           list ready tasks nobody has claimed, best first
//   node scripts/next-task.mjs --claim   claim the best one and check out its branch
//
// A task is claimed by a remote branch whose name contains its ID (task/T-123, codex/t-123-x, ...).
// --claim creates `task/T-xxx` from origin/main with one empty "Claim T-xxx" commit and pushes it;
// a push that loses a race just moves on to the next task. A claim branch that still holds only its
// claim commit after STALE_HOURS is treated as abandoned and can be claimed again.
// "Best" means: plan tasks first (they are quick and create the next tasks), then the task that
// unblocks the most open tasks (directly or through others), then lowest ID.

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadBacklog } from './check-tasks.mjs';

export const STALE_HOURS = 3;
const TASK_IN_BRANCH = /(?:^|\/)t-(\d{3})(?=\D|$)/i;

/** The task ID a branch name refers to, or null. */
export function taskIdOfBranch(name) {
  const match = TASK_IN_BRANCH.exec(name);
  return match ? `T-${match[1]}` : null;
}

/**
 * @param {{ name: string, claimOnly: boolean, ageHours: number }[]} branches
 * @returns {Set<string>} task IDs with a live claim
 */
export function claimedIds(branches, staleHours = STALE_HOURS) {
  const ids = new Set();
  for (const branch of branches) {
    const id = taskIdOfBranch(branch.name);
    if (id && !(branch.claimOnly && branch.ageHours > staleHours)) ids.add(id);
  }
  return ids;
}

/**
 * Ready tasks without a live claim: plans first, then by how many open tasks wait on them.
 * @param {{ id: string, status: string, dependsOn: string[], type?: string }[]} tasks
 * @param {{ id: string }[]} ready
 * @param {Set<string>} claimed
 */
export function rankReady(tasks, ready, claimed) {
  const dependents = new Map(tasks.map((t) => [t.id, []]));
  for (const task of tasks) {
    if (task.status === 'done') continue;
    for (const dep of task.dependsOn) dependents.get(dep)?.push(task.id);
  }
  const unblocks = (id) => {
    const seen = new Set();
    const stack = [...(dependents.get(id) ?? [])];
    while (stack.length) {
      const next = stack.pop();
      if (seen.has(next)) continue;
      seen.add(next);
      stack.push(...(dependents.get(next) ?? []));
    }
    return seen.size;
  };
  return ready
    .filter((task) => !claimed.has(task.id))
    .map((task) => ({ ...task, unblocks: unblocks(task.id) }))
    .sort(
      (a, b) =>
        Number(b.type === 'plan') - Number(a.type === 'plan') ||
        b.unblocks - a.unblocks ||
        a.id.localeCompare(b.id),
    );
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

function remoteBranches() {
  git('fetch', '--quiet', '--prune', 'origin', '+refs/heads/*:refs/remotes/origin/*');
  const now = Date.now() / 1000;
  return git('for-each-ref', '--format=%(refname:strip=3)', 'refs/remotes/origin')
    .split('\n')
    .filter((name) => name && name !== 'HEAD' && taskIdOfBranch(name))
    .map((name) => {
      const ref = `origin/${name}`;
      const ahead = Number(git('rev-list', '--count', `origin/main..${ref}`));
      const subject = git('log', '-1', '--format=%s', ref);
      const time = Number(git('log', '-1', '--format=%ct', ref));
      return {
        name,
        claimOnly: ahead <= 1 && subject.startsWith('Claim '),
        ageHours: (now - time) / 3600,
        sha: git('rev-parse', ref),
      };
    });
}

function claim(candidates, branches) {
  for (const task of candidates) {
    const name = `task/${task.id}`;
    const stale = branches.find((b) => b.name === name);
    git('switch', '--quiet', '-C', name, 'origin/main');
    git('commit', '--quiet', '--allow-empty', '-m', `Claim ${task.id}`);
    const lease = stale ? [`--force-with-lease=${name}:${stale.sha}`] : [];
    try {
      git('push', '--quiet', ...lease, 'origin', `HEAD:refs/heads/${name}`);
      git('branch', '--quiet', '--set-upstream-to', `origin/${name}`);
      return task;
    } catch {
      // Someone claimed it first: try the next task.
    }
  }
  return null;
}

function main(argv) {
  const { result } = loadBacklog();
  if (result.errors.length) {
    console.error(result.errors.join('\n'));
    process.exit(1);
  }
  const branches = remoteBranches();
  const candidates = rankReady(result.tasks, result.ready, claimedIds(branches));
  if (!argv.includes('--claim')) {
    for (const t of candidates) console.log(`${t.id}\tunblocks ${t.unblocks}\t${t.title}`);
    if (!candidates.length) console.log('No ready, unclaimed task.');
    return;
  }
  const claimed = claim(candidates, branches);
  if (!claimed) {
    console.log('NONE');
    return;
  }
  console.log(`${claimed.id}\t${claimed.file}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
