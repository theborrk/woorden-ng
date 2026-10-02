// Parses Claude's review verdict marker and decides the `claude-review` commit status.
// Used by .github/workflows/review-gate.yml (via actions/github-script) and unit-tested in scripts/.
//
// Marker format (posted by the Claude review routine as the last line of its summary comment):
//   <!-- claude-review:v1 verdict=approve|changes sha=<40-hex head commit> round=<n> -->

'use strict';

const MARKER =
  /<!--\s*claude-review:v1\s+verdict=(approve|changes)\s+sha=([0-9a-f]{40})\s+round=(\d+)\s*-->/i;

// The routine posts as the repository owner (routines act with your GitHub identity).
// Bots (including coding agents) are never trusted to set the gate.
const TRUSTED_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);

/** @returns {{ verdict: 'approve' | 'changes', sha: string, round: number } | null} */
function parseVerdict(body) {
  if (typeof body !== 'string') return null;
  const match = MARKER.exec(body);
  if (!match) return null;
  return {
    verdict: /** @type {'approve' | 'changes'} */ (match[1].toLowerCase()),
    sha: match[2].toLowerCase(),
    round: Number(match[3]),
  };
}

function isTrustedComment(comment) {
  if (!comment || !comment.user) return false;
  if (comment.user.type === 'Bot' || /\[bot\]$/.test(comment.user.login)) return false;
  return TRUSTED_ASSOCIATIONS.has(comment.author_association);
}

/**
 * @returns {{ action: 'set', state: 'success' | 'failure', description: string, labelsToAdd: string[], labelsToRemove: string[] }
 *          | { action: 'skip', reason: string }}
 */
function decide(comment, headSha) {
  const parsed = parseVerdict(comment && comment.body);
  if (!parsed) return { action: 'skip', reason: 'No claude-review marker in comment.' };
  if (!isTrustedComment(comment)) {
    return { action: 'skip', reason: `Untrusted author ${comment.user && comment.user.login}.` };
  }
  if (parsed.sha !== String(headSha).toLowerCase()) {
    return {
      action: 'skip',
      reason: `Verdict is for ${parsed.sha.slice(0, 7)} but the PR head is ${String(headSha).slice(0, 7)} (stale review).`,
    };
  }
  const approved = parsed.verdict === 'approve';
  return {
    action: 'set',
    state: approved ? 'success' : 'failure',
    description: approved
      ? `Claude approved (round ${parsed.round})`
      : `Claude requested changes (round ${parsed.round})`,
    labelsToAdd: [approved ? 'claude-approved' : 'claude-changes-requested'],
    labelsToRemove: [
      'needs-claude-review',
      approved ? 'claude-changes-requested' : 'claude-approved',
    ],
  };
}

module.exports = { MARKER, parseVerdict, isTrustedComment, decide };
