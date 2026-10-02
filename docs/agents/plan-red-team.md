# Plan and backlog red-team (Claude)

Use this for two things:

- **One-off, before any code:** a Claude Code session (claude.ai/code or the Code tab in the Claude
  app) that critiques `docs/architecture/`.
- **Backlog PRs:** PRs that only change `docs/` (for example the output of task T-001). The review
  routine applies this checklist to them automatically.

## Prompt for the one-off architecture red-team

```text
Red-team the architecture in docs/architecture/ for this repository. It was written with GPT-6
Astra and will be implemented by OpenAI Codex as a PWA plus Android app (Capacitor), from a phone-only
workflow (see AGENTS.md and docs/WORKFLOW.md). Do not modify files.

Report, most important first, in at most one screen of text:
1. Blocking gaps: anything that would force rework if discovered later (data model, sync and
   offline conflicts, auth and accounts, storage limits, privacy/GDPR for an EU user, background
   work on Android, push notifications, migrations, error states).
2. Risky assumptions: what the plan takes for granted about the PWA or Capacitor platform
   (service worker limits, storage eviction, WebView differences, plugin availability).
3. Decisions the plan leaves open that should become ADRs in docs/adr/ before coding starts.
4. Testability: which parts cannot be covered by Vitest + Playwright on mobile Chromium, and what
   to do about it.
5. The first 3 vertical slices you would build, each small enough for one PR.
End with a list of concrete edits to the architecture docs, as bullet points the owner can paste
into a Codex task.
```

## Checklist for backlog PRs

Blocking if any of these fail:

- Every task file passes `npm run check:tasks` (CI enforces this) and has size S or M.
- Each task is a **vertical slice** that leaves the app working and demonstrable, not a layer
  ("build the data layer").
- Acceptance criteria are observable and testable: Given/When/Then style, each naming whether a
  unit or e2e test proves it. No "works well", "is fast", "clean code".
- Dependencies (`depends_on`) are correct and minimal, so tasks can run in parallel where possible.
- Coverage: every in-scope capability in `docs/architecture/` maps to at least one task, or is
  listed as explicitly deferred in `docs/tasks/README.md`.
- Native work (plugins, permissions) is isolated in its own tasks, so web tasks don't wait on
  Android builds.
- No task requires capabilities the agents lack (secrets, paid services, a physical device) without
  saying how the owner provides them. Emulator checks are fine: they run in CI as device tests in
  `e2e-android/`, but the implementing agent cannot run them locally.
- When `docs/tasks/required-refs.json` exists, every listed requirement, work package and test ID
  appears in some task's `refs` (`npm run check:tasks -- --strict-refs`), and each task's `refs` are
  ones it really implements.

Non-blocking: naming, ordering preferences, wording.
