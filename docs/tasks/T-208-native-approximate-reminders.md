---
id: T-208
title: Schedule and reconcile approximate native reminders
status: todo
size: M
depends_on: [T-207, T-131]
type: task
refs: [W48, F14, T69, I17]
---

## Goal

An Android learner can opt into approximate reminders and disable them without losing study access.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Verified maintained local-notification plugin with explicit inexact scheduling or documented API proof; gesture permission, no exact-alarm permission/backend, minimum manifest permissions and android:sync. Cancel-before-replace for selected profile/zone/routine/upgrade/restart, verified boot mechanism and delivery limitations.

Out (do not do in this task):

- Shared feature redesign, Android SDK installation, cloud delivery or exact alarms.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given denied/revoked permission or disable, when reconciled, then no pending alarm remains and local study/export works (device test, CI emulator).
- [ ] AC2: Given timezone/profile/quiet-hour/upgrade/reboot changes, when reconciled, then only the selected owner has inexact pending reminders without duplicates (unit and device test, CI emulator).
- [ ] AC3: Given force-stop or battery suppression, when inspected, then delivery limitations are explicit; a delivered tap opens Today/resume without an answer and creates no study event (device test, CI emulator; owner phone smoke test for actual delivery).

## Notes for the implementer

Native work: yes. Primary files: `src/platform/android/reminders/`, `e2e-android/t-208.spec.ts`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
