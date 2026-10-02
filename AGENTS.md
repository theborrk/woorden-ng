# AGENTS.md

Instructions for AI coding agents in this repository. **OpenAI Codex implements, Claude reviews,
the owner merges** (usually from a phone). Read this whole file before starting a task.

## The product

**Woorden NG**: an offline Dutch vocabulary trainer, shipped as a Progressive Web App and as an
Android app from the same TypeScript codebase (Capacitor). The specification is
[`docs/architecture/blueprint.md`](docs/architecture/blueprint.md) as amended by the decisions in
[`docs/adr/`](docs/adr/); start with [`docs/architecture/README.md`](docs/architecture/README.md). The
work is split into small tasks in [`docs/tasks/`](docs/tasks/).

### Woorden rules (on top of everything below)

- **The blueprint's section 1 is addressed to you**, the implementing agent. In particular: no
  runtime AI or LLM calls, provider SDKs, remote speech recognition or paid services; nothing
  stubbed, simulated or unreviewed is presented as a finished production feature.
- **No data migration from the old app** (ADR 0003): never read its `woorden.*` storage keys or
  import its v1 backup files.
- **`legacy/` is a read-only reference.** Never edit, build, deploy or import it at runtime. Content
  tools may read `legacy/index.html` to extract the seed.
- **Blueprint IDs in tests:** start test titles that prove a blueprint test case or invariant with
  its ID (for example `T19: late-night review lands on the next study day`), so the traceability
  report (W40) can find them. Leave the task's `refs` as they are.
- **Domain code stays pure** (section 6): no React, DOM, network, storage or live clock in the
  domain layer; inject time and identifiers.
- **Content honesty:** generated or unreviewed content is never marked reviewed (T50); the original
  Russian text is preserved (F06).
- **Attribution:** keep the MIT license and the credit to the original author (`LICENSE`,
  `README.md`).

## Your role (Codex)

You implement **one task per pull request**, from a spec in `docs/tasks/`. You do not merge, and you
do not edit the process files listed under [Protected files](#protected-files).

## Hard rules (breaking one is a blocking review finding)

1. **One task per PR, nothing outside its Scope.** Spotted something else worth doing? Write it under
   "Assumptions and open questions" in the PR body. Do not do it.
2. **Every acceptance criterion is proven by a test** that would fail without your change.
3. **Green before you push:** `npm run verify` and `npm run test:e2e:web` pass. Never weaken, skip
   (`.skip`, `.only`, `test.fixme`) or delete tests to get green. Never lower lint or TypeScript
   strictness. No `@ts-ignore`; `eslint-disable` only with a one-line justification.
4. **No secrets or personal data** in code, tests, fixtures, logs or screenshots.
5. **No new runtime dependency** unless the task or architecture calls for it. Justify each new
   dependency in the PR body (what, why, size, license).
6. **Do not touch [Protected files](#protected-files)** unless the task explicitly says so.
7. **Ambiguity:** choose the most conservative reading, write it under "Assumptions and open
   questions", and continue. If you truly cannot proceed, open the PR as a draft explaining the
   blocker.

## Environment

- Node 22 (`.nvmrc`). Setup script: `bash scripts/agent-setup.sh` (runs `npm ci` and installs the
  Playwright browsers listed in `package.json` under `config.playwrightBrowsers`).
- **There is no Android SDK in your environment.** Do not run Gradle, an emulator or the device
  tests, and do not try to install the SDK. CI builds the debug APK and runs the device tests on an
  emulator, and reports failures in the PR's CI summary comment.
- If the sandbox already has a Chromium binary, set `PW_CHROMIUM_PATH` to it instead of downloading
  one.

## Commands

| Purpose                                     | Command                                                            |
| ------------------------------------------- | ------------------------------------------------------------------ |
| Install                                     | `npm ci`                                                           |
| Everything CI checks except e2e             | `npm run verify`                                                   |
| Unit tests (Vitest)                         | `npm run test:unit`                                                |
| Web end-to-end tests (Playwright)           | `npm run test:e2e:web` (builds `dist/web` and serves it)           |
| Device tests (CI only, see [Tests](#tests)) | `npm run test:e2e:android`                                         |
| Build the PWA                               | `npm run build:web` → `dist/web` (`APP_BASE=/sub/` for a sub-path) |
| Build the web bundle for Android            | `npm run build:android` → `dist/android` (no service worker)       |
| Dev server                                  | `npm run dev`                                                      |
| Fix formatting                              | `npm run format`                                                   |
| Validate the backlog, show ready tasks      | `npm run check:tasks` (`-- --ledger` prints a table)               |
| After adding or updating a Capacitor plugin | `npm run android:sync`, then commit `android/` too                 |

CI also runs these scripts as soon as `package.json` defines them, so adding one switches it on:
`content:validate` (part of `verify`), `test:repositories:web`, `test:backup-interop` and
`content:coverage`, and on the emulator `test:repositories:android` and `test:e2e:android`. Keep
these names.

## Project layout

| Path                  | What                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `src/`                | App code (TypeScript). Unit tests next to the code as `*.test.ts`                             |
| `src/targets/`        | Composition roots of the two build targets: `web.ts` (PWA) and `android.ts` (Capacitor)       |
| `e2e/`                | Web e2e tests: Playwright on mobile Chromium (Pixel 7) against the production web build       |
| `e2e-android/`        | Device tests: Playwright attached to the Android app's WebView on an emulator                 |
| `public/`             | Static assets and icons. `public/_headers` sets Cloudflare caching headers                    |
| `android/`            | Capacitor Android project. Signing and versioning live in `android/app/build.gradle`          |
| `app.config.ts`       | App identity for the web (name, id, colors), the single source used by the manifest           |
| `capacitor.config.ts` | Capacitor configuration (`webDir` is `dist/android`)                                          |
| `scripts/`            | Repo tooling: task checker, versioning, rename, review gate, agent setup, device test runner  |
| `docs/`               | Architecture, ADRs, tasks, review standard, workflow                                          |
| `.github/`            | CI workflows, CI policy (`ci-policy.json`), PR template, labels, ruleset, agent loop settings |

## Coding standards

- TypeScript strict, as configured. No `any`; prefer narrow types and discriminated unions.
- Small modules and pure functions; side effects at the edges (`src/main.ts`, adapters).
- Never put untrusted data into `innerHTML`; use `textContent` or the framework's escaping.
- No silent `catch`. Failures get a user-visible state (error, retry, offline).
- Accessibility: semantic HTML, labelled controls, 44px touch targets, works at 360px width,
  supports dark mode.
- **Two build targets, one codebase.** `npm run build:web` and `npm run build:android` differ only in
  the composition root `src/targets/<target>.ts`, imported as `#target` (by `src/main.ts` only).
  Platform-specific implementations sit behind an interface and are wired there. Feature code never
  picks an implementation by checking the platform at runtime, and only modules imported by
  `src/targets/android.ts` may import Capacitor plugins. `detectPlatform` (`src/platform.ts`) is for
  display and UX differences only.
- Comments explain why, not what.
- Once a task adopts the UI framework and conventions from `docs/architecture/`, those conventions
  apply too.

## PWA rules

- The app stays installable and works offline after the first visit (the e2e test "keeps working
  offline" must keep passing).
- The service worker exists in the web target only: `vite-plugin-pwa` generates it and
  `src/targets/web.ts` registers it with an update prompt (`src/sw.ts`). The Android target never
  registers one; updates there ship with the APK.
- The web build may be served from a sub-path (`APP_BASE`). Reference assets with relative URLs or
  `import.meta.env.BASE_URL`, never a hard-coded leading `/`.
- Add runtime caching for API calls only when a task asks for it, and describe the cache strategy in
  the PR.

## Capacitor and Android rules

- Add plugins with `npm install @capacitor/<plugin>`, run `npm run android:sync`, and commit the
  resulting `android/` changes.
- Request the minimum Android permissions; declare them in
  `android/app/src/main/AndroidManifest.xml` and explain each one in the PR.
- Every native capability has a web implementation of the same interface (or a graceful
  degradation) in the web target, so web e2e tests still cover the flow.

## Tests

- **Unit (Vitest, happy-dom):** logic and DOM rendering, as `src/**/*.test.ts`.
- **Web e2e (Playwright):** at least one test per user-facing acceptance criterion, named after it.
  End each with `await snap(page, '<short name>')` from `e2e/support/review.ts`; screenshots are
  published on the PR preview for the owner and the reviewer.
- **Device tests (Playwright on an Android emulator, CI only):** for what only the real app can show:
  native plugins and storage, data surviving an app restart, Android lifecycle. Write them in
  `e2e-android/` with `test` from `e2e-android/support/device.ts`:
  - the `app` fixture is a freshly launched app with empty storage (a Playwright `Page` attached to
    its WebView);
  - `launchApp(device, { clearData: false })` restarts the app and keeps its data;
  - `snapDevice(device, name)` saves a screenshot of the device screen.

  CI runs them in the "Android device tests" job when native or storage code changes (see
  `.github/ci-policy.json`). You cannot run them, so keep them small, reuse the fixtures, make sure
  `npm run typecheck` passes, and work from the CI summary comment when they fail.

- No fixed waits (`waitForTimeout`). Use Playwright's auto-waiting and `expect.poll`.
- Tests are deterministic and run without internet: mock network calls with `page.route`.

## Task protocol

1. Read the task file, the architecture sections it links to, and this file.
2. Implement the task and its tests. Run `npm run verify` and `npm run test:e2e:web`.
3. In the task file, set `status: done` and tick each acceptance criterion you proved (merging the PR
   is what makes it done). Leave its `refs` list as it is.
4. Open the PR. Title: `T-xxx: summary`. Body: `.github/pull_request_template.md`, whose first line
   is `Task: T-xxx`.
5. **Review fixes:** when you receive Claude's "Fix brief", fix only the listed blocking items (plus
   whatever keeps the tests green), fill in "Review response" in the PR body, and push to the same
   branch.
6. **CI failures:** read the CI summary comment on the PR, fix the root cause, and push to the same
   branch.

## Protected files

Change these only when the task explicitly says so:

`AGENTS.md`, `CLAUDE.md`, `docs/REVIEW.md`, `docs/WORKFLOW.md`, `docs/agents/**`, `.github/**`,
`scripts/lib/review-gate.cjs`, `scripts/android-version.mjs`, `scripts/rename-app.mjs`,
`scripts/device-tests.sh`, `android/app/build.gradle` (signing, versioning, application ID),
`android/app/debug.keystore`, the `id` in `app.config.ts`, and `appId` in `capacitor.config.ts`.

## Review guidelines

For any automated reviewer, including Codex code review if it is enabled: apply
[`docs/REVIEW.md`](docs/REVIEW.md). A missing or unproven acceptance criterion is P1.
