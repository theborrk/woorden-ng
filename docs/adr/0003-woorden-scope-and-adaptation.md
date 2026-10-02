# ADR 0003: Woorden NG scope and how the blueprint maps onto this repository

- **Status:** accepted
- **Date:** 2026-10-02

## Context

Woorden NG redevelops [iamsergeyka/woorden](https://github.com/iamsergeyka/woorden) following the
blueprint in [`docs/architecture/blueprint.md`](../architecture/blueprint.md). The owner changed its
scope, and the blueprint assumes an implementer (Claude Code) and a host (GitHub Pages) that differ
from this repository's setup (ADR 0001, ADR 0002). This ADR records both, so tasks and reviews apply
the blueprint consistently.

## Decisions

### 1. No data migration from the old app

The owner decided on 2 October 2026 that preserving learning progress from the original app is
dropped from the plan.

- **Out of scope:** blueprint section 17.3 (legacy v1 migration), work package W08, tests T31, T33
  and T34, scenario 26.5, the `legacyEvidence` and calibration state that existed only for migrated
  progress, and section 18.3's "preserve the origin for legacy migration".
- **Read broadly:** nothing is imported from the old app's storage (`woorden.progress`,
  `woorden.settings`, `woorden.meta`, `woorden.custom`) or from its v1 backup files: no review
  progress, settings, streaks or custom words. People start fresh in the new app.
- **Still in scope:** the 1,946 seed entries are content, not progress. They are extracted from
  `legacy/index.html` into fixtures (W01), get immutable IDs, and keep their original positional IDs
  (`s0`…`s1945`) as provenance (W07). T32 and invariant I08 apply in full.
- **Narrowed:** W07's "legacy mapping" becomes provenance metadata only; W01 needs the seed fixture
  but no export-format fixture; the `legacySnapshots` store from section 17.1 isn't needed, while
  `migrationJournal` stays for the app's own database and content migrations.
- **Unaffected:** the new backup format and import (section 17.2, W09, T35–T37, T64, T71).
- **Reversible:** an importer for old v1 backup files can be added later as its own task, following
  section 17.3.

### 2. Implementer and review

"Claude Code" in the blueprint means the implementing agent: here Codex implements one task per pull
request, Claude reviews, and the owner merges (ADR 0001). Section 1's "ask only when…" questions go
into the PR body's "Assumptions and open questions" for the owner.

### 3. Identity and signing

- Application ID `io.github.theborrk.woorden`, name "Woorden": a namespace the owner controls
  (section 18.4). It is permanent after the first Google Play upload.
- Debug builds use the `.dev` suffix (`io.github.theborrk.woorden.dev`), the separate development
  package section 18.4 allows (it suggests `.debug`).
- Release versionCode comes from the `vMAJOR.MINOR.PATCH` tag and is monotonic (section 18.6); debug
  builds use a build-time code.

### 4. Hosting

The PWA is hosted on Cloudflare Pages at the root path, with a preview per pull request (section
18.3 allows any HTTPS static host). The base path stays configurable (`APP_BASE`), and the web
end-to-end tests are expected to pass under `/woorden/` as well as `/` (section 6).

### 5. CI gates (section 23.2)

`.github/ci-policy.json` sets:

- `androidOnEveryPr: true`: the Android compile runs on every pull request.
- `deviceTests: "affected"`: native repository and bridge tests run on pull requests that touch
  native or storage code, and on every release (the Release workflow).
- `emulatorApiLevel: 36`: the current target SDK. The declared minimum SDK (24) can't be covered by
  CI emulators, because old system images ship a WebView too old for the app and can't update it.
  W36/W50 decide how the minimum is verified (raise `minSdk`, a Play-enabled image, or a physical
  device) and record it.

Browsers for the web end-to-end tests come from `config.playwrightBrowsers` in `package.json`:
Chromium now, Firefox and WebKit once the tests support them (section 18.7, W36).

The required script names (section 23.1) are run by CI whenever `package.json` defines them (ADR
0002). The bootstrap provides `typecheck`, `lint`, `test:unit`, `build:web`, `build:android`,
`test:e2e:web` and `test:e2e:android`; tasks add `test:repositories:web`, `test:repositories:android`,
`content:validate`, `content:coverage` and `test:backup-interop`.

### 6. Backlog and requirement ledger (section 1, W03, W40)

- `docs/tasks/required-refs.json` lists every in-scope ID: F01–F14; W01–W07, W09–W40 and W47–W51;
  T01–T30, T32, T35–T50, T57 and T60–T75; I01–I24.
- Not listed: W08 (this ADR), W41–W45 (deferred), W46 (retired); T31, T33, T34 (this ADR); T51–T55
  and T59 (deferred sync), T56 (retired), T58 (deferred Web Push).
- M0 is written as ordinary tasks. Later milestones start as `type: plan` tasks that list the IDs
  they will break down; `npm run check:tasks` runs with `--strict-refs`, so the ledger is complete
  from day one and every plan must hand its IDs on to real tasks before it can be marked done.

### 7. Repository layout

- The original app is frozen in `legacy/`: unchanged, never built, deployed or edited. Its MIT
  license stays in the root `LICENSE`, and the README credits the original author.
- The build-target composition roots live in `src/targets/` (ADR 0002). They may move under
  `src/app/` (section 6) as long as the `#target` import keeps working.
- Web end-to-end tests are in `e2e/` and device tests in `e2e-android/` (section 6 says
  `tests/e2e/`). Unit and domain tests may sit next to the code or in `tests/domain/` and
  `tests/integration/`.

## Consequences

- People who used the original app start over in the new one; the original stays available where it
  is until the owner retires it.
- M2 is smaller and has no migration risk; it focuses on content identity and the new backup format.
- The ledger in every CI run summary shows which IDs are still only planned, which is how progress
  toward "complete F01–F14" is tracked.
