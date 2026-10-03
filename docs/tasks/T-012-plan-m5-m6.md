---
id: T-012
title: Plan the tasks for milestones M5 and M6
status: todo
size: M
depends_on: [T-001, T-011]
type: plan
refs:
  [
    W18,
    W19,
    W20,
    W21,
    W22,
    W23,
    W24,
    W25,
    T08,
    T11,
    T12,
    T26,
    T27,
    T40,
    T43,
    T44,
    T45,
    T48,
    T50,
    I07,
    I21,
    F02,
    F04,
    F07,
    F08,
  ]
---

## Goal

The work packages of M5 (full content operations and media pipeline) and M6 (full task repertoire) are broken down into small, testable task files, so Codex can
implement them one pull request at a time and the ledger shows real tasks instead of this plan.

## Context

- Blueprint: Sections 10, 14 and 15, 22.3, W18–W25 in section 24; the seed fixture from T-001
- Task format and traceability: `docs/tasks/README.md`; backlog review checklist:
  `docs/agents/plan-red-team.md`

## Scope

In:

- W18–W21: schemas, validators, the pack compiler and review UI, external-draft import without a
  generator API, EN/PL sense data accounting for every original entry, and audio/image manifests
  (T40, T43, T44, T50).
- W22–W25: article, listening, spelling, verb-form and cloze tasks, scripted situations and
  task-family activation (T08, T11, T12, T26, T27, T45, T48).
- Content review by a person is an external dependency: tasks prepare and track it but cannot
  self-approve content (T50).
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

- T-100 to T-122 (see "Content backlog" in `docs/tasks/README.md`) already break down part of
  W18–W21. Build on them instead of duplicating them: plan what remains (the full-catalog review UI,
  diff reports, image manifests, scaling the curriculum beyond the pilot) and M6, with
  `depends_on` pointing at the content tasks where needed.
- Order by risk and value: the riskiest unknowns first, polish late.
- A blueprint work package marked L usually becomes three to six tasks.
- Mark this plan `done` with all criteria ticked in the same PR.

## Notes for the reviewer

Apply `docs/agents/plan-red-team.md`. Coverage and test quality are the main risks.
