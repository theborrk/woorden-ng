---
id: T-011
title: Plan the tasks for milestones M3 and M4
status: todo
size: M
depends_on: [T-002, T-003, T-010]
type: plan
refs:
  [
    W10,
    W11,
    W12,
    W13,
    W14,
    W15,
    W16,
    W17,
    W47,
    W49,
    T01,
    T02,
    T03,
    T04,
    T05,
    T06,
    T07,
    T08,
    T09,
    T10,
    T11,
    T12,
    T13,
    T14,
    T15,
    T16,
    T17,
    T18,
    T19,
    T20,
    T21,
    T22,
    T23,
    T24,
    T25,
    T26,
    T27,
    T28,
    T29,
    T30,
    T38,
    T39,
    T60,
    T65,
    I01,
    I03,
    I04,
    I05,
    I06,
    I09,
    I10,
    I11,
    I13,
    I16,
    I17,
    F01,
    F03,
    F04,
  ]
---

## Goal

The work packages of M3 (scheduling, evidence and attempt correctness) and M4 (complete everyday learning flow: the first family release) are broken down into small, testable task files, so Codex can
implement them one pull request at a time and the ledger shows real tasks instead of this plan.

## Context

- Blueprint: Sections 9–13, 16, 22.1–22.2, 25 and 26.1–26.4, W10–W17, W47 and W49 in section 24; the FSRS and time spike results
- Task format and traceability: `docs/tasks/README.md`; backlog review checklist:
  `docs/agents/plan-red-team.md`

## Scope

In:

- W10 FSRS adapter (T02, T18, T60); W11 study dates and eligibility (T19–T22, T29); W12 attempt
  lifecycle and scoring (T01–T14, T16); W13 undo, stale drafts and concurrency (T13, T16, T17, T38,
  T39).
- W14–W17: onboarding, teaching, input modes, the session planner with budgets (T14, T15,
  T23–T28), Today, Finish and resume.
- The M4 parts of W47 (real study on Android, first native launch offline: T65) and W49 (the first
  signed internal-testing build).
- New task files numbered after the highest existing task, each with `refs` naming the blueprint IDs
  it implements, and `depends_on` pointing at real tasks.
- Questions about the blueprint, listed in the PR body.

Out (do not do in this task):

- Application code. Changes to `docs/architecture/` (propose them in the PR body instead).

## Acceptance criteria

- [ ] AC1: Every ID in this plan's `refs` appears in the `refs` of at least one new task: with this
      plan set to `done`, `npm run check:tasks` still passes (verify)
- [ ] AC2: Every new task is size S or M, a vertical slice, and has Given/When/Then criteria naming
      the test type (unit, integration, e2e, device test) that proves them (review)
- [ ] AC3: Native work (plugins, permissions) sits in tasks of its own, and every native task has a
      device test criterion (review)
- [ ] AC4: Dependencies are minimal and correct, so at least three tasks can start in parallel
      without touching the same files (review)

## Notes for the implementer

- M4 needs a reviewed representative starter fixture (blueprint M4 dependencies). That fixture is
  the 60-entry starter pilot admitted by T-120: tasks that load starter content for study depend on
  T-120 (or on T-116, studying only entries that are eligible).
- Order by risk and value: the riskiest unknowns first, polish late.
- A blueprint work package marked L usually becomes three to six tasks.
- Mark this plan `done` with all criteria ticked in the same PR.

## Notes for the reviewer

Apply `docs/agents/plan-red-team.md`. Coverage and test quality are the main risks.
