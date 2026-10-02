---
id: T-006
title: React app shell with hash routes and English/Polish interface
status: done
size: M
depends_on: []
type: task
refs: [W04, F06]
---

## Goal

The app runs as a React application with the blueprint's main screens reachable through hash routes
and an English/Polish interface, while everything the bootstrap guarantees (PWA, offline, both build
targets, tests) keeps working, so feature tasks can start.

## Context

- Blueprint: section 5 (A01) and the dependency note, section 6 (layout, hash routes, composition
  root, no service worker in native), section 16 (screens; EN/PL; accessibility), section 9.1, W04
  in section 24
- Current skeleton: `src/` (vanilla TypeScript), `src/targets/`, `vite.config.ts`,
  `e2e/smoke.spec.ts`, `e2e-android/smoke.spec.ts`

## Scope

In:

- React, React DOM and the Vite React plugin; Testing Library for component tests.
- Port the shell (app name, platform label, online/offline state, update banner) to React.
- Hash routes for Today, Study, Library, Progress and Settings, each an accessible placeholder
  reachable from the app's navigation; the rest of section 16's screens come with their features.
- An EN/PL localization skeleton with the interface language chosen in Settings (default from the
  browser language, falling back to English) and persisted for the session only until profiles
  exist. Justify the localization library in the PR.
- Keep the composition root contract: `src/main.ts` (or `src/app/`) imports `#target`; the service
  worker stays in the web target.
- An ADR recording the choices (React version, router approach, localization library).

Out (do not do in this task):

- Feature behavior on the screens, profiles, storage, native plugins (T-007).
- Any change to CI, workflows or protected files.

## Acceptance criteria

- [x] AC1: Given a phone-sized browser, when the app opens, then the shell renders the app name and
      navigation to every listed screen, and each route has its own URL hash (e2e, `snap()` per
      screen)
- [x] AC2: Given English is active, when the user switches the interface to Polish in Settings, then
      the navigation and screen titles change to Polish without a reload (e2e and unit)
- [x] AC3: Given the app was visited once, when the network goes offline and the page reloads, then
      the shell still renders (existing e2e test still passes)
- [x] AC4: Given a waiting service worker, then the update banner appears and its button activates
      the update (unit)
- [x] AC5: The app works under a sub-path: `APP_BASE=/woorden/ npm run test:e2e:web` passes (e2e)
- [x] AC6: Given the Android build on the emulator, then the shell renders and no service worker is
      registered (existing device tests still pass in CI)
- [x] AC7: The production web bundle's JavaScript stays under 150 kB gzip, as reported by
      `npm run build:web` and noted in the PR body (review)

## Notes for the implementer

- Keep the e2e tests' accessible names and test IDs, or update the tests in the same PR.
- Keyboard and touch have equivalent paths; visible focus; 44px targets (section 16).

## Notes for the reviewer

This task sets the conventions every later task copies: check the structure and naming carefully.

## Verification

- `npm run verify`: lint, formatting, TypeScript, unit tests and requirement ledger.
- `e2e/shell.spec.ts`: all five routes (a screenshot per screen), EN/PL switching without
  reload, session persistence, browser language defaults, keyboard/back navigation and dark mode.
- `e2e/smoke.spec.ts`: retained mobile shell, offline reload and manifest tests.
- `src/app/App.test.tsx` and `src/sw.test.ts`: shell behavior and waiting-worker activation.
- `e2e/bundle.spec.ts`: production JavaScript gzip budget, including service-worker assets.
- The full web suite also runs with `APP_BASE=/woorden/`.
- `npm run build:android` verifies the shared shell compiles. AC6 remains covered by the existing
  shell/no-service-worker device tests in `e2e-android/smoke.spec.ts`; emulator execution is CI-only
  per `AGENTS.md` and must be confirmed there.
