---
id: T-146
title: Inspect exposure gates and delayed recall evidence
status: done
size: M
depends_on: [T-143]
type: task
refs: [W11, T29, I03, I05, I06, I10]
---

## Goal

A contributor can inspect how teaching, browsing, hints and later feedback change eligibility and evidence labels without changing the scheduler.

## Context

- Blueprint §§9.4, 10.4, 12.2, 25 and T29; ADR 0005 task/locale eligibility.
- Reuse T-143 time projection; T-123 provides the eventual stored event format.

## Scope

In:

- Pure relevant-exposure aggregation and direct Node evidence inspector with actual clean gap.
- One-minute acquisition/relearning and ten-minute Review gates, primary-cue replay exception and retained reason/resource/phase.
- Acquiring/later recall/maintaining/needs-support projections: qualifying independent success on a later study day with six-hour clean gap; maintaining needs two later days.
- Per-task/cue-family evidence with missing history explicit, no inherited mastery.

Out (do not do in this task):

- Progress dashboards/experiments, scheduling transitions, content authoring or event persistence.

## Acceptance criteria

- [x] AC1: Given teaching, word-detail support or recap exposure before a check, when inspected, then the relevant gate shifts by one/ten minutes as configured and the raw scheduler remains unchanged (unit and integration).
- [x] AC2: Given allowed primary-cue replay or feedback after a locked response, when projected, then primary replay adds no help gate and feedback does not rewrite that response but affects the next clean gap (unit).
- [x] AC3: Given clean successes on one then two later study days with at least six elapsed hours, when projected, then later recall then maintaining appear only on the observed task family (unit).
- [x] AC4: Given same-day/short-gap/assisted success or missing exposure history, when projected, then no delayed independent label is invented and the actual gap/uncertainty stays visible (unit and integration).

## Notes for the implementer

Native work: no. Primary files: `src/domain/learning-evidence/`, `tools/learning/inspect-evidence.ts`, `tests/fixtures/learning/evidence/`.
Policy versions and raw inputs make reprojection possible. Diagnostic labels are evidence, never FSRS phase. Keep inspector commands separate from content validation/compiler ownership.

## Notes for the reviewer

Prove the distinction between a valid routine review after ten minutes and six-hour delayed evidence.
