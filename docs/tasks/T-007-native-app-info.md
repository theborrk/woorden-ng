---
id: T-007
title: First native capability through the composition root, proven on the emulator
status: done
size: S
depends_on: [T-006]
type: task
refs: [W04, W47, F14]
---

## Goal

Settings shows the installed app's version and build number: on Android from the native App plugin,
on the web from build metadata. This proves the whole path for native capabilities (interface,
web and Android implementations, composition root, device test) before storage work depends on it.

## Context

- Blueprint: section 6 (composition root; never infer capabilities from the user agent), section
  18.4 (ports table), W04's acceptance ("a native plugin call is verified on device/emulator") and
  W47
- ADR 0002 and `e2e-android/support/device.ts`

## Scope

In:

- An `AppInfo` port with a web implementation (version and commit from build-time constants) and an
  Android implementation using `@capacitor/app`, wired in `src/targets/web.ts` and
  `src/targets/android.ts`.
- An "About" section in Settings showing version and build.
- A device test in `e2e-android/` and a web e2e test.

Out (do not do in this task):

- Other native capabilities, release metadata (W49).

## Acceptance criteria

- [x] AC1: Given the Android debug app on the emulator, when Settings opens, then About shows the
      native version name and version code from the installed APK (device test with `snapDevice`)
- [x] AC2: Given the web app, when Settings opens, then About shows the build's version and commit
      (e2e with `snap()`)
- [x] AC3: The web bundle does not contain the App plugin, and feature code reads the information
      only through the port (unit test of the web target, plus review)

## Notes for the implementer

Add the plugin with `npm install @capacitor/app`, then `npm run android:sync`, and commit the
`android/` changes. You can't run the emulator: work from the CI summary comment if the device test
fails.

## Notes for the reviewer

This task is the template for every later native capability: interface first, both
implementations, device test.

## Verification

- AC1: `e2e-android/app-info.spec.ts` compares About with the installed package's `versionName`
  and `versionCode` from Android PackageManager (`dumpsys package`), then calls `snapDevice`.
  Emulator execution is CI-only per `AGENTS.md`; confirm the Android device job before merge.
  `src/platform/android/app-info.test.ts` verifies the Android composition root calls the native
  plugin, maps its result and propagates failures.
- AC2: `e2e/app-info.spec.ts` compares About with `package.json` version and the build checkout's
  Git commit, then calls `snap`. Both are injected by Vite at build time; no release metadata added.
- AC3: `src/targets/web.test.ts` verifies the web target supplies the port with build constants
  and fails if it imports the App plugin. `src/features/settings/About.test.tsx` proves Settings
  reads an injected port even with an Android display label, localizes About and shows failures.
  `e2e/bundle.spec.ts` inspects production source maps for the web adapter and excludes the App
  plugin and Android adapter.
- Regression proof: all five new unit tests and both new web e2e checks fail against the unchanged
  baseline (`321589f`), with the new tests copied into an isolated worktree.
- `npm run verify`: 212 tests pass, plus lint, formatting, TypeScript, task ledger and content checks.
- `npm run test:e2e:web`: all 13 tests pass; the full suite also passes with `APP_BASE=/woorden/`.
- `npm run android:sync`: Android bundle builds and the App plugin is registered in the committed
  generated Gradle files. No Android SDK, Gradle or emulator was run locally.
