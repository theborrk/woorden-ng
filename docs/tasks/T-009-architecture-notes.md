---
id: T-009
title: Record resolved versions, the lockfile policy and release targets
status: done
size: S
depends_on: [T-002, T-003, T-004, T-005]
type: task
refs: [W03, F13]
---

## Goal

One page tells any developer which versions the project is built on, how they are kept reproducible,
and which platforms a release targets, as section 5 and W03 require.

## Context

- Blueprint: section 5 (dependency note: pin, lock, record resolved versions), section 18.4 (SDK
  levels), section 18.7 (platform matrix), section 23.1–23.3, W03 in section 24
- Results of the M0 spikes: `docs/architecture/spikes/`
- ADR 0003, section 5 (CI gates and the emulator limitation)

## Scope

In:

- `docs/architecture/notes.md`: resolved versions of Node, npm, TypeScript, Vite, React (if T-006 has
  landed), Capacitor and its plugins, ts-fsrs, Dexie, the Temporal choice, JDK, Android Gradle
  Plugin, Gradle wrapper, compile/target/min SDK; the lockfile and Dependabot policy (which updates
  need native or scheduler-replay checks, section 23.2); release targets (browsers, Android
  versions, emulator API levels in CI and the minimum-SDK gap).
- A unit test that fails when `notes.md` and `package.json`/`android/variables.gradle` disagree on
  the pinned versions it lists.

Out (do not do in this task):

- Changing any version.

## Acceptance criteria

- [x] AC1: Given `package.json`, `package-lock.json` and `android/variables.gradle`, when the notes
      test runs, then every version listed in `notes.md` matches them (unit)
- [x] AC2: The notes state the lockfile policy, the update policy and the release targets, including
      how the minimum SDK will be verified (review)

## Notes for the implementer

Keep the page short and factual; link to the spike documents for details.

## Notes for the reviewer

Check the versions against the lockfile, not against what the spikes intended.
