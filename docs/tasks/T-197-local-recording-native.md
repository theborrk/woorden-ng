---
id: T-197
title: Recover native recording across focus and lifecycle changes
status: todo
size: M
depends_on: [T-196, T-135, T-163]
type: task
refs: [W27, F07, F14, T48, T49, T57, T68, I17]
---

## Goal

An Android learner can record locally and recover safely from focus loss or permission revocation.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Verify WebView recording or choose a maintained native adapter; microphone permission only after a gesture, focus/headset/pause/back cancellation, transient cleanup and explicitly saved durable files. No ASR/cloud fallback; minimum permissions and android:sync.

Out (do not do in this task):

- Shared feature redesign, Android SDK installation, cloud delivery or exact alarms.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given permission denial/revocation or unavailable recorder, when selected, then local written study/export still work with no learner penalty (device test, CI emulator).
- [ ] AC2: Given active recording and focus/headset/background/process changes, when resumed, then draft survives, no autoplay occurs and abandoned temporary clips are cleaned (device test, CI emulator).
- [ ] AC3: Given explicitly saved audio, when restarted and exported, then bytes persist in durable native storage and the result stays self-report (device test, CI emulator).

## Notes for the implementer

Native work: yes. Primary files: `src/platform/android/local-recording/`, `e2e-android/t-197.spec.ts`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
