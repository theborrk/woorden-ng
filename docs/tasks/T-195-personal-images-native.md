---
id: T-195
title: Store private images in durable native files
status: todo
size: M
depends_on: [T-194, T-135, T-163]
type: task
refs: [W26, F05, F14, T57, T68]
---

## Goal

An Android learner can pick a private image and retain it after process recreation.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Native scoped picker/file adapter behind the shared image port, persistent app files and SQLite references; canceled URI access or interrupted writes never activate missing media. Minimum plugin/permissions only, sync committed native changes.

Out (do not do in this task):

- Shared feature redesign, Android SDK installation, cloud delivery or exact alarms.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given a picked photo, when the app restarts, then persistent files and SQLite references resolve the same hash (device test, CI emulator).
- [ ] AC2: Given revoked URI access, canceled picker or interrupted file write, when resumed, then prior media stays active with a retry state (device test, CI emulator).
- [ ] AC3: Given export or image removal, when applied, then logical backup bytes/history remain consistent and no device permission is exported (device test, CI emulator).

## Notes for the implementer

Native work: yes. Primary files: `src/platform/android/personal-images/`, `e2e-android/t-195.spec.ts`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
