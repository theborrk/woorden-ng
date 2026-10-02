# ADR 0001: Agent workflow and delivery pipeline

- **Status:** accepted
- **Date:** 2026-10-02

## Context

The owner develops from an Android phone, without a PC, using a ChatGPT subscription (Codex) and a
Claude subscription. The product is a PWA that also ships as an Android app. Code lives on GitHub.

## Decisions

1. **One codebase:** TypeScript + Vite PWA, wrapped for Android with Capacitor. No separate native
   app. The PWA service worker is disabled in native builds; updates there ship with the APK.
2. **Roles:** Codex (cloud tasks) implements one task per PR; Claude reviews; the owner merges.
   Using different vendors for writing and reviewing reduces shared blind spots.
3. **GitHub is the orchestrator:** task files in `docs/tasks/`, PRs, labels and commit statuses
   connect the agents. No custom orchestration service, so nothing runs on subscription credentials
   outside the vendors' own products.
4. **Merge gate:** two required checks: `ci-ok` (all CI jobs) and `claude-review` (a commit status
   set only for the exact commit Claude reviewed). Claude runs as a Claude Code routine triggered
   by a label that CI adds when tests pass; a small workflow converts its verdict marker into the
   status. A GitHub Actions reviewer is available as a fallback (`CLAUDE_REVIEWER=action`).
5. **Phone-first feedback:** every PR gets a sticky summary comment with a Cloudflare Pages preview,
   a screenshot gallery from the e2e tests, a directly installable debug APK when native files
   changed, and copy-paste blocks for Codex when something fails.
6. **Android signing:** release key generated in CI and stored only as repository secrets, with an
   encrypted backup for the owner. A deliberately public debug key is committed so debug builds
   update in place; debug builds use a `.dev` application ID suffix so they install next to
   release builds.
7. **Versioning:** release version codes derive from the `vMAJOR.MINOR.PATCH` tag; debug version
   codes from build time.

## Consequences

- Android builds and emulator tests happen only in CI; agents verify web behavior locally with
  Playwright, so native features need web implementations or fallbacks to stay testable (see ADR
  0002 for the build targets and device tests).
- Branch protection with required checks needs a public repository or GitHub Pro.
- The review routine relies on Claude Code routines (research preview) and GitHub webhooks; if they
  misbehave, the Actions-mode reviewer or a manual verdict marker keeps the gate usable.
