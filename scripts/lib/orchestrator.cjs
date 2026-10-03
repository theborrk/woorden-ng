// Decisions for unattended operation: auto-merging approved pull requests, carrying an approval
// over a pure "update from main" merge, and asking Codex to fix CI failures.
// Used by .github/workflows/auto-merge.yml and ci.yml (via actions/github-script); unit-tested in
// scripts/scripts.test.mjs. Settings live in .github/agent-loop.json.

'use strict';

// Labels that stop the orchestrator from merging a pull request.
const HOLD_LABELS = ['hold', 'needs-human', 'blocked'];
const CI_AUTOFIX_MARKER = '<!-- codex-autofix:ci -->';
const CONFLICT_MARKER_PREFIX = '<!-- auto-merge:conflict';

/**
 * @param {{
 *   config: { autoMerge?: boolean, autoMergeDependabot?: boolean },
 *   pr: { state: string, draft: boolean, mergeable: boolean | null, author: string },
 *   labels: string[],
 *   ciOk: string | null,         // conclusion of the latest `ci-ok` check run for the head commit
 *   claudeReview: string | null, // state of the `claude-review` commit status for the head commit
 *   behindBy: number,            // commits on the base branch that the head does not contain
 * }} input
 * @returns {{ action: 'merge' | 'update' | 'conflict' | 'wait', reason: string }}
 */
function mergeDecision({ config, pr, labels, ciOk, claudeReview, behindBy }) {
  if (!config.autoMerge) return { action: 'wait', reason: 'autoMerge is off' };
  if (pr.state !== 'open') return { action: 'wait', reason: 'not open' };
  if (pr.draft) return { action: 'wait', reason: 'draft' };
  if (pr.author === 'dependabot[bot]' && !config.autoMergeDependabot) {
    return { action: 'wait', reason: 'Dependabot PRs are merged by hand (autoMergeDependabot)' };
  }
  const hold = labels.find((name) => HOLD_LABELS.includes(name));
  if (hold) return { action: 'wait', reason: `label ${hold}` };
  if (ciOk !== 'success') return { action: 'wait', reason: `ci-ok is ${ciOk ?? 'missing'}` };
  if (claudeReview !== 'success') {
    return { action: 'wait', reason: `claude-review is ${claudeReview ?? 'missing'}` };
  }
  // Tested against an older main: bring it up to date first; CI and the carried-over approval
  // then decide again.
  if (behindBy > 0) return { action: 'update', reason: `${behindBy} commit(s) behind the base` };
  if (pr.mergeable === false) return { action: 'conflict', reason: 'merge conflicts' };
  return { action: 'merge', reason: 'CI green and Claude approved this commit' };
}

/**
 * True when the head commit only merged the base branch into an already approved commit, as the
 * "update branch" API does: a GitHub-made (web-flow), verified two-parent commit whose first parent
 * was approved and whose second parent is already on the base branch. Conflict resolutions made
 * by an agent are never carried over: they are new code and get a new review.
 * @param {{ parentCount: number, committerLogin: string | null, verified: boolean,
 *           firstParentApproved: boolean, secondParentOnBase: boolean }} commit
 */
function canCarryOverApproval(commit) {
  return (
    commit.parentCount === 2 &&
    commit.committerLogin === 'web-flow' &&
    commit.verified &&
    commit.firstParentApproved &&
    commit.secondParentOnBase
  );
}

/**
 * What to do after a CI failure when nobody is watching.
 * @param {{ codexAutoFix?: boolean, maxReviewRounds?: number }} config
 * @param {{ hasToken: boolean, earlierRequests: number }} state
 * @returns {'mention' | 'needs-human' | 'none'}
 */
function ciFailureAction(config, { hasToken, earlierRequests }) {
  if (!config.codexAutoFix || !hasToken) return 'none';
  return earlierRequests >= (config.maxReviewRounds ?? 3) ? 'needs-human' : 'mention';
}

module.exports = {
  HOLD_LABELS,
  CI_AUTOFIX_MARKER,
  CONFLICT_MARKER_PREFIX,
  mergeDecision,
  canCarryOverApproval,
  ciFailureAction,
};
