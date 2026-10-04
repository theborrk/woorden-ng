---
id: T-013
title: Plan the tasks for milestones M7 and M8
status: done
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

- [x] AC1: Every ID in this plan's `refs` appears in the `refs` of at least one new task: with this
      plan set to `done`, `npm run check:tasks` still passes (verify)
- [x] AC2: Every new task is size S or M, a vertical slice, and has Given/When/Then criteria naming
      the test type (unit, integration, e2e, device test) that proves them (review)
- [x] AC3: Native work (plugins, permissions) sits in tasks of its own, and every native task has a
      device test criterion (review)
- [x] AC4: Dependencies are minimal and correct, so at least three tasks can start in parallel
      without touching the same files (review)

## Notes for the implementer

- Order by risk and value: the riskiest unknowns first, polish late.
- A blueprint work package marked L usually becomes three to six tasks.
- Mark this plan `done` with all criteria ticked in the same PR.

## Notes for the reviewer

Apply `docs/agents/plan-red-team.md`. Coverage and test quality are the main risks.

## Planned slices and evidence

T-190–T-208 allocate M7–M8 and W48. IDs start after T-172–T-189 reserved in the open
T-012 PR; these files depend only on tasks on main, so that PR is not a hidden code dependency.
Support/metrics/reminder inspectors T-190/T-191/T-192 can start in parallel now with disjoint
primary files and no manifest/barrel edits. T-203 is another independent comparison inspector.
T-193–T-200 provide support/private-word/media workflows with native adapters and a cross-target
backup slice. T-201/T-202 extend evidence/adaptation rather than duplicating M4 T-158.
T-203–T-206 split experiment assignment/UI and optimizer dataset/local fitting/review/rollback.
T-207 supplies shared routine settings/web cues and T-208 owns the native plugin and permissions.

Native work is isolated in T-195/T-197/T-200/T-208 with CI-only emulator criteria. Actual
phone media, force-stop, notification and battery behavior remain recorded external checks.
No credentials, paid optimizer or backend is required. T-205 must verify a local maintained
optimizer interface; insufficient data or unavailable compatible tooling yields explicit failure,
never mock parameter success. T-120 admission remains transitive for starter study through M4.

Run `node --test docs/tasks/T-013-plan-m7-m8.test.mjs` for AC1–AC4 structural evidence,
`npm run check:tasks`, `npm run verify` and `npm run test:e2e:web`. The executable coverage,
criteria, native ownership and dependency checks supplement semantic plan-red-team review.
New task criteria remain unchecked until implementations and actual evidence exist.
