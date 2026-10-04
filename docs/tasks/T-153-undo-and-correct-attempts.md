---
id: T-153
title: Undo or correct a graded attempt by replaying retained history
status: todo
size: M
depends_on: [T-150, T-145]
type: task
refs: [W13, T17, I03, I10, F01]
---

## Goal

A learner can correct an evaluator judgment or undo an earlier attempt after subsequent reviews, with an inspectable recomputed schedule and preserved exposures.

## Context

- Blueprint §8 undo rules, §10.3 evaluator correction and T17.
- Reuse T-129 projection checkpoints and T-145 supported versioned replay.

## Scope

In:

- Explicit UndoAttempt/correction events referencing originals, reason and judgment source; immutable originals remain.
- Rebuild affected schedule/evidence/counters/eligibility from the last valid checkpoint and remaining ordered supported events, then atomically activate projections.
- Minimal history correction UI/command driver showing before/after and unsupported-replay blocker.
- Prior reveal/hint/feedback exposures survive correction and undo.

Out (do not do in this task):

- Blind snapshot overwrite, event deletion, sync reconciliation or full history/progress dashboard.

## Acceptance criteria

- [ ] AC1: Given an earlier grade and subsequent reviews, when that grade is undone, then supported replay of remaining ordered events matches the resulting schedule/projections and all original events remain (integration and e2e).
- [ ] AC2: Given an evaluator correction with a stated reason, when saved, then a new correction event retains the original initial result/source and replay uses the corrected judgment without a second unrelated grade (integration and e2e).
- [ ] AC3: Given reveal/help before an undone grade, when projected afterward, then those exposures still gate future trials and cannot create unaided delayed evidence (integration).
- [ ] AC4: Given unsupported historical replay or failed projection activation, when correction is requested, then a visible blocker preserves prior durable state and original history (integration and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/application/learning/corrections/`, `src/features/study/corrections/`, `tests/integration/learning/corrections.test.ts`, `e2e/study-corrections.spec.ts`.
Starter study: yes. Prepare replay outside the transaction and recheck the watermark/base before activation. Use a minimal task-history entry point; the full study screen will consume it later. Keep reasons/local data out of automatic uploads.

## Notes for the reviewer

Require a later-review fixture; undoing only the last grade does not prove T17.
