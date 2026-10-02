# Review standard

How pull requests are reviewed here. Claude applies it; Codex reads it to know what will be checked.
The goal is **fast convergence on correct, tested, in-scope code**, not perfection.

## What to check, in order

1. **Spec compliance.** Every acceptance criterion in the task file is implemented **and** proven by a
   test that would fail without the change. Nothing outside the task's Scope: no drive-by refactors,
   no unrelated dependencies, no surprise features.
2. **Correctness.** Logic errors; edge cases (empty data, offline, slow network, permission denied,
   app resumed from background, rotation, 360px width); race conditions; error handling (no swallowed
   errors, every failure has a user-visible state).
3. **Security and privacy.** No secrets or personal data in code or tests. No untrusted data in
   `innerHTML`. Input validation. Sensitive data not stored in `localStorage`. New Android
   permissions justified. New third-party scripts or SDKs justified (privacy, GDPR).
4. **PWA.** Still installable, still works offline, service worker update flow intact, caching of
   API data only as the task specifies.
5. **Capacitor and Android.** Native code is wired only through the Android composition root
   (`src/targets/android.ts`) and has a web implementation or fallback in the web target. Plugin
   added means `android/` sync changes are committed. Minimal permissions. No service worker in
   native. Native behavior (plugins, storage, restarts) is covered by device tests in `e2e-android/`.
6. **Tests.** They test behavior, not implementation. Deterministic (no fixed waits). Each
   user-facing criterion has an e2e test ending in `snap()`. No `.skip`, `.only`, or weakened
   assertions.
7. **Architecture fit.** Follows `docs/architecture/` and `docs/adr/`. A deliberate deviation is
   explained in the PR or proposed as an ADR.
8. **Maintainability.** Clear names, no dead code, no duplication worth fixing now, TypeScript
   strictness kept (no `any`, no unexplained `!`).
9. **UX and accessibility** (use the screenshots when you have them): readable at 360px, touch
   targets of 44px or more, labelled controls, contrast, loading, empty and error states.
10. **Performance.** Unexplained bundle growth, heavy dependencies, large images.

For **backlog or plan PRs** (only `docs/` changes), use the checklist in
[`docs/agents/plan-red-team.md`](agents/plan-red-team.md) instead.

## Severity

- **Blocking (P0/P1):** wrong behavior; an acceptance criterion missing or unproven; a security or
  privacy issue; data-loss risk; breaks offline, installability or the Android build; a test that
  does not test what it claims; risky scope creep; any AGENTS.md hard rule broken.
- **Non-blocking:** style, naming, small refactors, ideas. Prefix with `nit:`. Never block on them.
  At most 3 nits per review.

**Verdict:** `approve` if and only if there are zero blocking findings.

### Convergence rule (rounds 2 and later)

Only block on (a) earlier blocking findings that are still unresolved, (b) new blocking problems
introduced by the fix commits, or (c) a serious issue missed earlier, stating why it is serious. Do
not raise new style preferences in later rounds. After the round limit in
`.github/agent-loop.json`, stop asking for fixes and hand over to the owner.

### What a reviewer does not do

Rewrite the design, ask for an alternative approach without naming a concrete defect, or ask for
documentation of trivial code.

## Summary comment format

Post exactly one summary comment per review. Keep it short; the owner reads it on a phone.

````markdown
## Claude review · round N · ✅ Approve | ❌ Changes requested

**Task:** T-012 Title · **Commit:** `abc1234` · **Spec compliance:** ✅ | ⚠️ | ❌ one line

### Blocking

1. `src/path/file.ts:42`: what is wrong, why it matters, what fixed looks like.

(or "None")

### Non-blocking

- nit: ...

### Fix brief for Codex

```text
Address the blocking findings from Claude's review (round N) of PR #<number>:
1. <file:line> <what to change> - prove it with <test>.
Change nothing else. Update the "Review response" section of the PR body. Push to the same branch.
```

<!-- claude-review:v1 verdict=changes sha=<full 40-character head sha> round=N -->
````

- Leave out "Fix brief for Codex" when approving.
- **The last line must be the verdict marker** with `verdict=approve` or `verdict=changes`, the full
  SHA of the head commit you reviewed, and the round number (1 + earlier summaries on this PR). The
  `Review gate` workflow turns it into the required `claude-review` status; a marker for an older
  commit is ignored.
- Inline comments go on the specific lines (one PR review with event `COMMENT`), up to
  `maxInlineComments` from `.github/agent-loop.json`. Never use the Approve or Request changes review
  events; the status check is the gate.
