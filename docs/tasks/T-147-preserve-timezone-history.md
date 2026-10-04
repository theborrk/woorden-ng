---
id: T-147
title: Change study time preferences without rewriting history
status: todo
size: M
depends_on: [T-129, T-143]
type: task
refs: [W11, T20, T22, I10, F03]
---

## Goal

A learner can change timezone/boundary/windows, see which future projections change, and recover a clock anomaly without a fabricated or punitive review.

## Context

- Blueprint §12.3 and T22; T-126 owns profile settings and T-129 atomic repositories.
- Reuse T-143 projection and T-003 resolved-boundary interpretation.

## Scope

In:

- Settings preview/confirmation for timezone/boundary/window changes with future-only default and explicit existing-date rescheduling.
- Retain historical study dates/zones, existing raw due/eligible instants by default and introduction counts for the current study-day budget.
- Injected wall/monotonic clock boundary detecting suspicious/backward changes; retain draft and show correction/retry instead of negative elapsed data.

Out (do not do in this task):

- New preference schemas/repositories, alarm scheduling, response-speed grading or OS clock changes.

## Acceptance criteria

- [ ] AC1: Given saved history and pending due instants, when the profile timezone changes normally, then old history/due instants remain intact and only future projections use the new zone (integration and e2e).
- [ ] AC2: Given an explicit reschedule preview, when confirmed or canceled, then only the declared upcoming eligibility changes atomically or remains unchanged while raw scheduler/history stays intact (integration and e2e).
- [ ] AC3: Given boundary edits or travel within the current allowance period, when Today is queried, then introduced concepts are not forgotten and a second daily allowance is not silently minted (unit and e2e).
- [ ] AC4: Given an injected backward/large clock jump during a draft, when grading is attempted, then the anomaly is visible, no negative interval or penalty is committed and the draft remains recoverable (unit and integration).

## Notes for the implementer

Native work: no. Primary files: `src/application/time-preferences/`, `src/platform/web/clock/`, `src/features/settings/study-time/`, `e2e/study-time.spec.ts`.
Clock anomalies block unsafe grading until a sane instant is available; never adjust FSRS from a stopwatch. A settings edit cannot create a fresh allowance for the same introductions. Keep native clock/platform work separate.

## Notes for the reviewer

Explicit rescheduling changes a presentation projection, not historical observations or remembered stability.
