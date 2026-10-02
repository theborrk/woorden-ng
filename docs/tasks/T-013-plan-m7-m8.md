---
id: T-013
title: Plan the tasks for milestones M7 and M8
status: todo
size: M
depends_on: [T-011]
type: plan
refs:
  [
    W26,
    W27,
    W28,
    W29,
    W30,
    W31,
    W48,
    T05,
    T06,
    T24,
    T25,
    T29,
    T30,
    T48,
    T49,
    T57,
    T68,
    T69,
    I15,
    I17,
    F05,
    F07,
    F09,
    F14,
  ]
---

## Goal

The work packages of M7 (personal memory supports and input) and M8 (evidence, adaptive load and measured personalization) are broken down into small, testable task files, so Codex can
implement them one pull request at a time and the ledger shows real tasks instead of this plan.

## Context

- Blueprint: Sections 4, 15, 18.5, 19, 22, W26–W31 and W48 in section 24
- Task format and traceability: `docs/tasks/README.md`; backlog review checklist:
  `docs/agents/plan-red-team.md`

## Scope

In:

- W26–W28: supports and personal images, local audio recording and playback without any
  transcription service, personal words and overrides (T05, T06, T48, T49, T57, T68).
- W29–W31: metrics, adaptive caps with explanations, optional comparison mode and optimizer
  workflow (T24, T25, T29, T30).
- W48: native approximate local reminders with permission, quiet hours and profile reconciliation
  (T69).
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

- Order by risk and value: the riskiest unknowns first, polish late.
- A blueprint work package marked L usually becomes three to six tasks.
- Mark this plan `done` with all criteria ticked in the same PR.

## Notes for the reviewer

Apply `docs/agents/plan-red-team.md`. Coverage and test quality are the main risks.
