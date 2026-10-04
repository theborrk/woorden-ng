---
id: T-200
title: Round-trip private media through both backup targets
status: todo
size: M
depends_on: [T-195, T-197, T-140]
type: task
refs: [W27, W28, F07, F14, T57, T68]
---

## Goal

An Android learner can restore saved photos and recordings from a portable backup and use them offline.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Native private-media resolver/backup handoff using existing staged restore; shared web-native-web fixture with exact bytes, IDs, hashes and event equivalence. Do not copy platform permissions or temporary audio; fail visibly on missing files.

Out (do not do in this task):

- Shared feature redesign, Android SDK installation, cloud delivery or exact alarms.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given a PWA backup with saved clips/photos, when restored on Android and reexported to web, then exact media bytes and logical identities/history survive (integration and device test, CI emulator).
- [ ] AC2: Given an interrupted restore, corrupt media or disk failure, when resumed, then prior active profile/media remains intact with recoverable staging (device test, CI emulator).
- [ ] AC3: Given microphone/notification permission state or unsaved clips, when exported, then permissions/local OS IDs and transient bytes are absent (integration and device test, CI emulator).

## Notes for the implementer

Native work: yes. Primary files: `src/platform/android/private-media-backup/`, `e2e-android/private-media/`, `e2e-android/t-200.spec.ts`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
