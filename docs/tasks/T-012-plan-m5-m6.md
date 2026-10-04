---
id: T-012
title: Plan the tasks for milestones M5 and M6
status: done
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

- [x] AC1: Every ID in this plan's `refs` appears in the `refs` of at least one new task: with this
      plan set to `done`, `npm run check:tasks` still passes (verify)
- [x] AC2: Every new task is size S or M, a vertical slice, and has Given/When/Then criteria naming
      the test type (unit, integration, e2e, device test) that proves them (review)
- [x] AC3: Native work (plugins, permissions) sits in tasks of its own, and every native task has a
      device test criterion (review)
- [x] AC4: Dependencies are minimal and correct, so at least three tasks can start in parallel
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

## Planned slices and evidence

T-172–T-189 complete the remaining M5–M6 work. T-175 reuses imports/sample packets and
check results; T-176 accounts for every original row and T-177 scales bounded curriculum
batches. T-172/T-178/T-179 handle media and data-only artifact publication. T-173/T-174
expose risky rule/span contracts before the focused article/listening/spelling/form/cloze,
picture and situation UI. T-186 owns activation budgets and T-188 varied confusion contexts.
T-189 isolates native audio interruption behavior with CI-only device criteria. Runtime
pack downloads, staged installation and native executable updates remain with M9.

T-172, T-173 and T-174 can start together from completed T-110. Their primary directories
are disjoint; they do not edit manifests or shared barrels. Other dependencies reuse M4
transactions, planner, typing and audio services. T-120 remains the admitted starter path
through T-159; no draft fixture grants production eligibility. Actual Dutch sample checks,
visual QA and physical-phone voice QA remain external evidence, following ADR 0005.

Run `node --test docs/tasks/T-012-plan-m5-m6.test.mjs` for AC1–AC4 structural evidence
(unchanged refs, bounded/testable slices, native isolation, nonredundant graph and three
ready disjoint inspectors), plus `npm run check:tasks`, `npm run verify` and
`npm run test:e2e:web`. These supplement semantic review under plan-red-team.md;
new implementation tasks remain unchecked until their actual tests pass.
