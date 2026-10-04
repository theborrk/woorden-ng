---
id: T-131
title: Recover durable drafts across native lifecycle transitions
status: todo
size: M
depends_on: [T-130]
type: task
refs: [W47, T62, T72, I18, I20, F14]
---

## Goal

Android can resume a persisted session/draft summary after backgrounding or process recreation,
with preserved profile/content context and no claim that an unfinished attempt was completed.

## Context

- Blueprint §§8, 17.4, 18.4; T-130 durable sessions/drafts and transaction recovery.
- This is M1–M2 lifecycle groundwork; full study/audio interruption behavior remains in T-011/W17/W27.

## Scope

In:

- LifecycleService port, browser visibility counterpart and maintained Capacitor lifecycle adapter.
- Checkpoint command at semantic/draft changes, serialized close/reopen ownership and startup
  recovery of incomplete operations; pause is supplementary, never the only checkpoint.
- A Today resumable-draft summary for actual stored context, retirement notice on incompatible
  content, and system-back handling of overlays/navigation/exit without grading or revealing answers.

Out (do not do in this task):

- Attempt/scoring UI, audio focus/recording, reminders, signed updates or background services.
- Resetting assistance/exposure, copying drafts across profiles or clearing storage to recover.

## Acceptance criteria

- [ ] AC1: Given a persisted draft with help/content/profile context, when backgrounded and killed
      without a final pause callback, then restart offers its summary with the same context and no completed event (device test).
- [ ] AC2: Given overlays and an unfinished draft, when system back closes/navigates/exits, then
      the latest checkpoint survives and neither an answer reveal nor duplicate grade is created (device test).
- [ ] AC3: Given a different selected profile or incompatible content revision, when resumed,
      then the old draft is isolated or marked interrupted with its exposure history retained (unit and device test).
- [ ] AC4: Given browser visibility changes, when a durable draft checkpoint is requested, then
      the same port uses the web repository without importing native plugins (unit and e2e).

## Notes for the implementer

Native work: yes. Primary files: `src/application/lifecycle/`, `src/platform/web/lifecycle/`,
`src/platform/android/lifecycle/`, `src/features/today/resume/`, `src/targets/`,
`e2e-android/lifecycle.spec.ts`. Add/pin the lifecycle plugin if needed, justify it, sync Android and
commit generated native changes. Device execution is CI-only; no exact lifecycle timing guarantee.

## Notes for the reviewer

The summary is a real recovery slice, not a simulated study feature. Durable change checkpoints
must protect against abrupt death even when pause events never arrive.
