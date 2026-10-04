---
id: T-163
title: Run everyday study and interruption recovery on Android
status: todo
size: M
depends_on: [T-162, T-131]
type: task
refs: [W47, W17, T13, T16, T38, T68, I09, I13, I17]
---

## Goal

An Android learner can use the shared everyday study/finish/resume flow with authoritative SQLite through backgrounding, keyboard/back actions and process recreation.

## Context

- Blueprint §§18.4, 22.4a, W47/W17; ADRs 0002 and 0006.
- Reuse T-130 SQLite commands and T-131 lifecycle checkpoints; T-162 supplies complete shared study UI.
- T-119 owns audio capabilities; this task consumes them without adding a second TTS/recording implementation.

## Scope

In:

- Wire actual shared teaching/attempt/planner/repair/recap commands into the native composition root and existing production repositories.
- Reuse lifecycle/back port for full Study overlays, keyboard, pause/resume and cold recreation; no answer leak/autoplay/false completion.
- Cancel current playback on card/background transitions through existing audio service; deterministic focus-loss notification integration where supported.
- Real native command parity checks on study results and profile isolation; preserved save errors/drafts.

Out (do not do in this task):

- Native SQLite/files/lifecycle plugin reimplementation, microphone recording, backups, reminders or signing changes.

## Acceptance criteria

- [ ] AC1: Given eligible starter study on the CI device, when teaching/help/grade/finish run and the app restarts, then real SQLite retains the same logical result as web and at most one scheduling transition (device test).
- [ ] AC2: Given a hinted/locked draft, when keyboard/back/background/process death interrupts it without a final callback, then resume preserves help/response/profile and produces no reveal or false completion (device test).
- [ ] AC3: Given playback interruption/card change or native save failure, when returning to Study, then playback is canceled, no target autoplays and the recoverable draft/unavailable state gives no learner penalty (device test).
- [ ] AC4: Given profile switch or incompatible prompt during interruption, when resumed, then isolation/retirement matches shared policy and no native-specific grading algorithm is used (device test).

## Notes for the implementer

Native work: yes. Primary files: `src/targets/android.ts`, `src/features/study/native-lifecycle/`, `e2e-android/study.spec.ts`.
Starter study: yes. Native tests run only in CI using the installed app and real bridge; no SDK/Gradle locally. If a new focus plugin/permission proves necessary, report a separate scoped prerequisite instead of silently expanding this task. Reuse existing native capability ports.

## Notes for the reviewer

This is M4 integration of real study, not another M1 lifecycle-summary task. Plugin mocks and web SQLite substitutes cannot prove it.
