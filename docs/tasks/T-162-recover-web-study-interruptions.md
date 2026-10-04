---
id: T-162
title: Recover web study after reload navigation and offline restart
status: todo
size: M
depends_on: [T-161, T-152]
type: task
refs: [W17, T13, T38, I03, I13, I17]
---

## Goal

A PWA learner can leave or reload a real study session and return offline to the same valid response/help state or an explicit interrupted-practice explanation.

## Context

- Blueprint §§9.3, 16, 17.4 and W17; T-151 resume policy and T-152 stale-tab UX.
- T-131 owns the lifecycle port/browser counterpart; reuse it when installed, while semantic checkpoints remain sufficient without callbacks.

## Scope

In:

- Connect Today resume and core study state to persisted commands at semantic response/help/navigation changes.
- Browser back/route changes/reload/visibility recovery with predictable focus and no answer autoplay on return.
- Content/activation invalidation UX retains exposure and offers a new valid prompt only after explicit action.
- Production PWA offline restart after initial cache readiness, retaining profile and session seed.

Out (do not do in this task):

- New lifecycle adapters/plugins, forced service-worker updates, storage recovery/backup reimplementation or Android tests.

## Acceptance criteria

- [ ] AC1: Given a sound hint or reveal followed by reload/offline restart, when Resume is selected, then the same attempt/help/phase returns and cannot be graded as clean or twice (e2e).
- [ ] AC2: Given a locked response and browser back/route interruption without visibility callbacks, when returning, then semantic checkpoints restore the response and neither autoplay nor a false completion occurs (e2e).
- [ ] AC3: Given an incompatible current content/grading revision or another profile, when Resume is attempted, then an explicit interrupted/isolated state retains exposures and opens no silently remapped prompt (e2e).
- [ ] AC4: Given a fresh supported PWA cache and recorded study data, when offline browser restart occurs, then ordinary study/finish/recap work with honest available-content/audio states and no network/microphone dependency (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/study/resume/`, `src/features/today/study-resume/`, `e2e/study-resume.spec.ts`.
Starter study: yes. Reuse persistence and T-151 rules; do not install a second browser visibility adapter. Device lifecycle signals are supplementary. Snapshots/screenshots must show the actual resumed learner state.

## Notes for the reviewer

Fault cases need an abrupt reload with no final pause callback. Avoid sleeps; use injected clock and web restart conditions.
