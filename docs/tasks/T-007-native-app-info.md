---
id: T-007
title: First native capability through the composition root, proven on the emulator
status: todo
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

- [ ] AC1: Given the Android debug app on the emulator, when Settings opens, then About shows the
      native version name and version code from the installed APK (device test with `snapDevice`)
- [ ] AC2: Given the web app, when Settings opens, then About shows the build's version and commit
      (e2e with `snap()`)
- [ ] AC3: The web bundle does not contain the App plugin, and feature code reads the information
      only through the port (unit test of the web target, plus review)

## Notes for the implementer

Add the plugin with `npm install @capacitor/app`, then `npm run android:sync`, and commit the
`android/` changes. You can't run the emulator: work from the CI summary comment if the device test
fails.

## Notes for the reviewer

This task is the template for every later native capability: interface first, both
implementations, device test.
