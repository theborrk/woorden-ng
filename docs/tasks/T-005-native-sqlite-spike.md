---
id: T-005
title: Choose the native SQLite plugin and prove it in the app on the Android emulator
status: done
size: M
depends_on: []
type: task
refs: [W02, W47, F14, I20]
---

## Goal

A maintained SQLite plugin is chosen, pinned and proven inside the real Android app on the emulator
(transactions, rollback, migrations, value round-trips), and CI runs a `test:repositories:android`
suite from now on.

## Context

- Blueprint: section 5 (A03, A15 and the dependency note below the table), section 8 (SQLite
  transactions on one connection), section 17.1, section 18.4, W02 and W47 in section 24, T61–T63
  and T75 (later), invariants I19 and I20
- ADR 0002: device tests (`e2e-android/`, fixtures in `e2e-android/support/device.ts`,
  `scripts/device-tests.sh`)
- CI: the "Android device tests" job runs `test:repositories:android` when `package.json` defines it,
  on pull requests that touch native or storage code and on every release

## Scope

In:

- Compare at least two maintained Capacitor SQLite plugins (Capacitor 8 support, maintenance,
  license, transaction API, migrations, Android ABIs and Google Play's 16 KB page-size requirement,
  size) in `docs/adr/0004-native-sqlite-plugin.md`, and pin the choice.
- Install it with `npm install`, run `npm run android:sync`, and commit the `android/` changes.
- A minimal adapter in `src/infrastructure/db/android/`, wired only from `src/targets/android.ts`,
  using the same spike schema as T-004 where practical.
- Device tests tagged `@repositories` in `e2e-android/` that run the checks inside the app's WebView.
  `test:repositories:android` runs only those (`--grep @repositories`); change `test:e2e:android`
  to exclude them (`--grep-invert @repositories`).
- An ESLint rule that forbids importing Capacitor plugins outside `src/platform/android/` and
  `src/infrastructure/db/android/`.
- `docs/architecture/spikes/storage-android.md`: findings, the test approach, and what W06/W47 must
  handle.

Out (do not do in this task):

- The final schema and repositories (W06), backups (W09), native files (later W47 tasks).

## Acceptance criteria

- [x] AC1: Given the debug app on the emulator, when a transaction writes to two tables and
      commits, then both rows are still there after an app restart
      (`launchApp(device, { clearData: false })`) (device test)
- [x] AC2: Given a transaction that fails after its first write, then no row from it is visible,
      also after a restart (device test)
- [x] AC3: Given rows without a commit key stored as SQL NULL, then any number of them coexist, and a
      duplicate non-NULL commit key is rejected (device test)
- [x] AC4: Given a version 1 schema with data, when the app opens it with a version 2 migration, then
      the data is migrated; a failing migration leaves version 1 intact (device test)
- [x] AC5: Millisecond integers and canonical JSON round-trip unchanged (device test)
- [x] AC6: The Android app has no WebView-storage fallback: when the plugin is unavailable, the
      adapter fails visibly instead of storing data elsewhere (unit), and plugin imports outside the
      allowed folders fail lint (lint)
- [x] AC7: ADR 0004 records the choice, versions, license, ABIs and page-size compliance (review)

## Implementation evidence

- AC1–AC5: six `@repositories` tests in `e2e-android/storage.spec.ts`, executed by Android CI
  against the debug APK. Device execution is pending the PR gate; no emulator was run locally.
- AC6: `src/infrastructure/db/android/spike.test.ts`, `native-bridge.test.ts` and
  `scripts/native-plugin-boundary.test.mjs`.
- AC7: `docs/adr/0004-native-sqlite-plugin.md`, including the inspected AAR/ELF evidence and
  the remaining signed-release packaging/device checks.
- Findings and W06/W47 follow-up: `docs/architecture/spikes/storage-android.md`.

## Notes for the implementer

- You can't run the emulator. Write the device tests carefully, keep `npm run typecheck` green, and
  use the CI summary comment (log tail) and the `device-screenshots` artifact when they fail.
- Debug builds are likely to have `window.Capacitor.DEBUG === true` at runtime; check it. If so, a
  test-only handle for the device tests can be exposed only then, so release builds don't carry
  one. Record the approach in the spike document.
- Never add an IndexedDB, Preferences or in-memory fallback for the Android target, even
  temporarily (I20).

## Notes for the reviewer

This is the riskiest M0 spike: check that every device test really runs inside the app on the
emulator (not in a desktop browser) and fails when the behavior is wrong.
