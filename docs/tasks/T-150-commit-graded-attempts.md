---
id: T-150
title: Commit eligible attempts at the actual grading instant
status: todo
size: M
depends_on: [T-149, T-142, T-147]
type: task
refs: [W10, W11, W12, T02, T03, T08, T09, T14, T16, T60, I01, I04, I06, I09, I10, I13, F03]
---

## Goal

A contributor can run a complete headless learning sequence that commits one honest classified outcome and one supported schedule through production repositories.

## Context

- Blueprint §§8, 10.2, 11.1–11.3, 12.2 and T60.
- T-149 supplies locked responses; T-142 FSRS and T-146 eligibility/evidence are reused.
- T-129 already owns atomic prepared writes; T-147 supplies the clock-anomaly boundary and owns settings UX.

## Scope

In:

- CommitAttempt composing classification, adapter, time/exposure projection and prepared-write command.
- Capture final grading instant once, re-read current state/eligibility before preparation and transactionally recheck revision/parent/hash.
- Attempt/event/parameter versions, before/after snapshots, raw due, eligibility, counters/outbox and honest postcommit acknowledgement.
- Scheduled eligible trials call FSRS once; early/extra practice, probes and technical/ungradable outcomes preserve observations without promotion.

Out (do not do in this task):

- Repositories/migrations, UI, native adapters, automatic retries across conflicts or parameter optimization.

## Acceptance criteria

- [ ] AC1: Given an eligible independent correct locked response, when committed through Dexie, then one Good transition agrees with the refreshed preview at the actual captured grading time and all projections survive reopen (integration).
- [ ] AC2: Given a preview followed by clock advance or a newer state, when grading commits, then stale data is recomputed or a base conflict is returned and the old preview is never applied (unit and integration).
- [ ] AC3: Given initial failure followed by assisted success, early practice or technical failure, when committed, then respectively one Again or no transition occurs, preserving initial result/help without time-based penalties (integration).
- [ ] AC4: Given duplicate submissions or failure after each prepared write, when retried, then at most one event/transition exists, failed writes preserve all prior state and unsaved drafts are never reported saved (integration).

## Notes for the implementer

Native work: no. Primary files: `src/application/learning/commit/`, `tests/integration/learning/commit.test.ts`, `tools/learning/run-sequence.ts`.
Starter study: yes. Use T-123 runtime validation and T-129 atomic writes; do not reproduce them. All nontransaction computation completes before the unit of work. Use injected times, never real waits. Record the cap policy in adapter/eligibility policy identity while preserving T-123 native snapshot invariants; project using the separately capped interval.

## Notes for the reviewer

Prove actual final-time capture and full event/projection consistency. The sequence must distinguish practice from eligible scheduling.
