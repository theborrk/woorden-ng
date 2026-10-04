---
id: T-148
title: Commit one reviewed introduction and its rehearsal exposures
status: todo
size: M
depends_on: [T-129, T-146, T-120]
type: task
refs: [W12, T01, I06, I16, F01, F04]
---

## Goal

A contributor can introduce an eligible starter sense through a real command/query driver, reopen its teaching state and see exposures with no manufactured review.

## Context

- Blueprint §§8, 9.2, 11.2 and 13.2; ADR 0005.
- T-120 supplies the admitted starter subset; T-110/T-114 own entries and eligibility.
- Reuse T-123 contracts, T-129 unit of work and T-146 exposure/evidence projection.

## Scope

In:

- IntroduceSense and RecordExposure commands through real Dexie, using immutable issued sense/task IDs and current per-task/locale admission.
- Introduction once per concept/profile/study date with durable enrollment, acquiring evidence and visible-answer rehearsal exposure.
- Query/driver showing initial gap, retained content revision and no scheduler result before a real eligible trial.
- Explicit admission/capacity authorization input, rechecked on introduction; later planner owns selection policy.

Out (do not do in this task):

- Rebuilding entry schemas/review/compiler, production study UI, native repositories or task-family activation policy.

## Acceptance criteria

- [ ] AC1: Given an admitted starter sense, when introduced and reopened via the command driver, then one concept introduction/enrollment is durable and teaching/rehearsal emit exposure only with no correct review (integration).
- [ ] AC2: Given a repeated introduction or another task variant of the same sense, when requested, then concept allowance is consumed once and original identity/history remains intact (integration).
- [ ] AC3: Given a missing/flagged/current-hash-ineligible task or locale, when introduced, then the command rejects it with its admission reason and creates no fabricated fallback or review approval (integration).
- [ ] AC4: Given a transaction failure or concurrent allowance consumption, when introduction commits, then enrollment/events/counters all save or all remain unchanged and a rejected operation consumes no allowance (integration).

## Notes for the implementer

Native work: no. Primary files: `src/application/learning/teaching/`, `tests/integration/learning/teaching.test.ts`, `tools/learning/run-teaching.ts`.
Starter study: yes. Reuse T-120 output, never treat all 60 drafts as eligible. Synthetic command fixtures may prove mechanics but cannot stand in for curated admission. Prepare hashing/content outside the unit of work. Driver output is the M3 headless slice.

## Notes for the reviewer

Count the concept at its first committed introduction, not when queued, clicked or first graded. Reuse prepared-write infrastructure.
