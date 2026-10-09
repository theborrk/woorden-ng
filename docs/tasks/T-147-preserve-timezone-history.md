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

## Worker blocker report

Checked against main `c1ce9dc` on 4 October 2026. This task remains `todo`; no
acceptance criteria are claimed as proved.

- The closed `preferences` schema in `src/contracts/runtime/records.ts` has timezone
  and boundary fields but no review-window preference. T-143 accepts a window as an
  inspector input only. Persisting the requested window settings requires a preference
  contract change, which this task explicitly excludes. The existing
  `ProfileRepositories` port also cannot access learning projections in the same
  transaction. Confirm ownership of the preference/transaction extension before
  implementing the atomic settings/reschedule flow.
- `src/app/App.tsx` renders a placeholder for Today. The committed-introduction
  flow (T-148) and subsequent session planner are not on main. AC3's real Today
  e2e cannot currently exercise an introduction allowance; a synthetic UI would
  not prove the requested behavior.
- The response-draft and grading commands are planned in T-149/T-150. T-150 itself
  depends on T-147. AC4 can eventually test an injected clock guard independently,
  but proving recoverable grading through the production command requires a staged
  acceptance boundary or moving that integration proof to T-150.

Suggested resolution: authorize the existing preference/transaction extensions,
identify the Today allowance owner, and separate the pre-grading clock boundary
from the later grading integration proof. Do not mark this task done or unblock
T-150 merely on the basis of this report.
