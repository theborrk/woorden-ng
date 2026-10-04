---
id: T-161
title: Show Today Finish and exposure-aware word recaps
status: todo
size: M
depends_on: [T-160]
type: task
refs: [W17, T28, T29, I06, I10, I11, I17, F01]
---

## Goal

A learner can start a manageable session from Today, finish immediately, inspect what was independently recalled versus assisted and revisit today’s words with honest exposure tracking.

## Context

- Blueprint §16, §13.2 and T28/T29; T-146 evidence and T-157 workload queries.
- Consume existing real teaching/feedback/support views instead of rebuilding content or progress stores.

## Scope

In:

- Today primary start/resume, proposed work/new allowance, remaining due count and next optional eligible suggestion.
- Finish-now from every study phase, checkpointing unfinished drafts rather than grading them; finish summary distinguishes independent/self-report/assisted/practice.
- Today’s words and minimal word detail using retained senses/examples/audio/support/evidence and repair/postpone actions.
- Actual displayed answer/support content records exposure; viewing a closed summary does not imply every listed answer was exposed.

Out (do not do in this task):

- Full Library/search/editing, progress analytics, notifications, native lifecycle wiring or update/download management.

## Acceptance criteria

- [ ] AC1: Given a backlog or all remaining tasks under a gap, when Today/Finish opens, then manageable proposed work and remaining due state are accurate and the learner can stop without a timer or reset (e2e).
- [ ] AC2: Given an unfinished or assisted attempt, when finish-now is chosen, then the draft/help is checkpointed and recap distinguishes actual saved independent versus assisted/practice outcomes without a fabricated completion (e2e).
- [ ] AC3: Given today’s words or word detail opened before a delayed check, when answer/support content is displayed, then exposure is durable and the next eligibility/clean-gap/evidence reflects it without an FSRS success (integration and e2e).
- [ ] AC4: Given a failed recap exposure save or missing optional audio, when detail is opened, then unsaved/unavailable state is explicit, no clean delayed claim is granted and written core study remains usable offline (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/today/overview/`, `src/features/finish/`, `src/features/words/study-detail/`, `e2e/today-finish.spec.ts`.
Starter study: yes. Reuse T-131 resumable summary data when the native lifecycle slice is available, without making web correctness depend on native plugins. Minimal detail is built from the teaching view. Never render unreviewed missing fields as curated facts.

## Notes for the reviewer

T29 requires actual display/exposure persistence, not simply opening a route or marking all listed words exposed.
