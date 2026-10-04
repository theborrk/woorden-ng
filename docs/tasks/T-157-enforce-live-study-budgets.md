---
id: T-157
title: Enforce concept and active-task budgets during a live session
status: todo
size: M
depends_on: [T-156]
type: task
refs: [W16, T23, T26, T28, I11, I16, F03]
---

## Goal

A contributor can change a daily cap mid-session and inspect a manageable selected portion while retained overdue history and active-task capacity remain accurate.

## Context

- Blueprint §§13.1–13.2, 25 and T23/T26/T28.
- T-148 owns first committed concept counting; T-156 owns live selection.

## Scope

In:

- Budget authorization for teaching/task activation, revalidated before prompt and inside introduction/activation commits.
- New-concept count once, independent active acquiring-task cap, zero/manual override and estimates from rolling foreground durations with bounded fallback.
- Session time target never interrupts an answer; finish-now command at any point.
- Proposed backlog portion and accurate remaining due count; postponement/budget omission preserves raw due/history.

Out (do not do in this task):

- Automatic adaptation, whole-course lockout, performance dashboards or native plugins.

## Acceptance criteria

- [ ] AC1: Given cached unintroduced candidates, when the cap changes to zero/one mid-session, then next selection and atomic introduction honor the new limit immediately without counting queued items (integration).
- [ ] AC2: Given one introduced sense with multiple activated modalities, when another variant is activated, then new-concept count stays unchanged but active-task capacity is enforced (unit and integration).
- [ ] AC3: Given a missed-week backlog, when a budgeted session is planned, then a manageable portion and exact remaining due count are returned and omitted/postponed tasks retain overdue state (integration).
- [ ] AC4: Given sparse durations, a long interruption or finish-now during an answer, when budget state is computed, then bounded foreground estimates exclude background time and stopping checkpoints rather than auto-submits or penalizes the learner (unit and integration).

## Notes for the implementer

Native work: no. Primary files: `src/application/session/budgets/`, `src/domain/workload-budget/`, `tests/integration/learning/budgets.test.ts`.
Starter study: yes. Reuse introduction counts/preferences, never add a second daily counter. Expose driver query results until T-159/T-161 provide UI. T-147 timezone edits must not mint another allowance.

## Notes for the reviewer

Review all write races around a changed cap, not just a pure function called with the new value.
