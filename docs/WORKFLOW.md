# Workflow

How work moves from a task file to a release, and who does what. Everything here works from a
phone: the GitHub app, the ChatGPT app (Codex), the Claude app, and a browser.

## Roles

| Who                 | Does                                                                                     | Never                         |
| ------------------- | ---------------------------------------------------------------------------------------- | ----------------------------- |
| **Codex** (ChatGPT) | Implements one task per PR, fixes review findings and CI failures                        | Merges, edits protected files |
| **Claude**          | Reviews every green PR (routine), red-teams plans and backlogs                           | Writes app code, merges       |
| **CI** (Actions)    | Lint, types, unit, e2e and device tests, APK builds, previews, review hand-off, the gate | Decides what is "good enough" |
| **You**             | Pick tasks, pass fix briefs to Codex, test previews on your phone, merge, release        | Review every line yourself    |

## The loop for one task

```
docs/tasks/T-xxx.md
   │  you: "Implement docs/tasks/T-xxx… following AGENTS.md" (Codex app)
   ▼
Codex opens PR ──► CI: verify · e2e · APK + device tests (if native) · preview
                         │ red: CI summary comment has a "Copy this into the Codex task" block
                         │ green: claude-review = pending, label needs-claude-review
                         ▼
                   Claude review routine ──► summary + verdict marker
                         │ changes: fix brief → same Codex task → Codex pushes → CI again
                         │ approve: claude-review = success, label claude-approved
                         ▼
   you: open the preview / APK from the CI summary comment, try it, then squash-merge
                         ▼
Main workflow: production PWA deploy + dev APK on the "dev-latest" pre-release
```

### Labels and statuses you will see

| Signal                     | Meaning                                                   | Your move                               |
| -------------------------- | --------------------------------------------------------- | --------------------------------------- |
| `ci-failed`                | A CI job failed on the latest commit                      | Paste the CI block into the Codex task  |
| `needs-claude-review`      | CI is green; the routine is (about to be) reviewing       | Wait (usually a few minutes)            |
| `claude-changes-requested` | Blocking findings                                         | Paste the fix brief into the Codex task |
| `claude-approved`          | Approved for the current commit                           | Test the preview, merge                 |
| `needs-human`              | Review round limit reached, or an agent is stuck          | Decide: clarify the task, fix, or close |
| `deep-review`              | You want a more thorough review                           | Add it before the review runs           |
| `skip-claude-review`       | You mark the review as passed (trivial or emergency PRs)  | Use sparingly                           |
| Status `ci-ok`             | Required. All CI jobs passed (skipped jobs count as pass) |                                         |
| Status `claude-review`     | Required. Claude's verdict on the **current** head commit |                                         |

A new push always resets `claude-review` to pending: an approval only ever applies to the exact
commit Claude read.

## Daily rhythm (phone)

1. **Pick work:** a task is ready when its `status` is `todo` and everything in its `depends_on` is
   `done` (every CI run prints the "Ready to start" list in the verify log). Start 1–3 Codex tasks
   that don't touch the same files.
2. **During the day:** notifications from GitHub tell you when PRs open, fail, or get reviewed.
   Each time it's a 30-second action: paste a block into Codex, or test and merge.
3. **When a task is merged:** the production PWA updates automatically; Obtainium (or the
   `dev-latest` release page) gives you the new dev APK.

Keep at most 2–3 PRs in flight. Your testing and merging is the bottleneck, and parallel PRs that
touch the same files cause merge conflicts.

## Releases

1. GitHub → Releases → **Draft a new release** → **Create new tag** `v0.1.0` (format `vMAJOR.MINOR.PATCH`,
   no suffix) → Publish.
2. The **Release** workflow runs the device tests on a debug build of the tag (when the project has
   them), then attaches a signed `.apk` (install directly or via Obtainium) and an `.aab` (upload to
   Google Play).
3. Android version codes come from the tag (`v1.2.3` → 1002003), so every release must have a higher
   version than the previous one.

## When things get stuck

- **Codex and Claude disagree for 3 rounds** → `needs-human`. Read the last summary; either clarify
  the task file (a small Codex task), accept the risk (merge with an admin bypass, or post the marker
  yourself), or close the PR.
- **A task turns out bigger than expected** → close the PR, ask Codex to split the task file into
  smaller tasks.
- **Main is broken** → revert the merge commit from the PR page ("Revert" button), then fix forward
  in a new task.
