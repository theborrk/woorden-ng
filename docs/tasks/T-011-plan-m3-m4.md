---
id: T-011
title: Plan the tasks for milestones M3 and M4
status: done
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

- [x] AC1: Every ID in this plan's `refs` appears in the `refs` of at least one new task: with this
      plan set to `done`, `npm run check:tasks` still passes (verify)
- [x] AC2: Every new task is size S or M, a vertical slice, and has Given/When/Then criteria naming
      the test type (unit, integration, e2e, device test) that proves them (review)
- [x] AC3: Native work (plugins, permissions) sits in tasks of its own, and every native task has a
      device test criterion (review)
- [x] AC4: Dependencies are minimal and correct, so at least three tasks can start in parallel
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

## Planned slices and acceptance evidence

T-142–T-167 implement this plan. M3 exposes executable inspectors and real command/query
sequences before the everyday UI; M4 connects those commands to shared PWA/Android study.
T-123 owns runtime records, T-126/T-129 web repositories, T-127/T-130 native repositories,
T-131 lifecycle checkpoints and T-134–T-141 backup/restore/interoperability. These are
prerequisites to reuse, not additional implementations in this plan.

T-110 remains the entry/ID contract owner; T-114 owns per-task/locale compilation. T-148
requires T-120's actual admitted starter subset, and every subsequent starter-study task has
that transitive prerequisite. T-118/T-119 supply approved audio and truthful local capability
states. No new task duplicates source imports, independent review or the pack compiler; no
unreviewed draft becomes curated study merely because its structure validates (ADR 0005).

| Work                | New tasks                  | Observable result                                                                                      |
| ------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------ |
| W10                 | T-142, T-145, T-150        | Native/effective previews, recorded policy versions, supported replay/rollback and actual-time grading |
| W11                 | T-143, T-146, T-147, T-150 | Calendar/window diagnostics, exposure/evidence gates and preserved timezone/clock history              |
| W12                 | T-144, T-148–T-150         | Honest classification and durable teaching, first response, help and one atomic grade                  |
| W13                 | T-151–T-153                | Resume/retirement, tab conflict handling and correction/undo after later reviews                       |
| W14                 | T-154, T-159, T-160        | Skippable setup, teaching/feedback, one optional support and repair/postpone                           |
| W15                 | T-155, T-159               | Sense-specific typed judgment and productive/receptive self-report or typed study                      |
| W16                 | T-156–T-158                | Live fair selection, concept/active-task/time budgets and conservative reversible suggestions          |
| W17                 | T-161–T-163                | Today/Finish, exposure-aware recap/detail and actual interruption/resume flows                         |
| W47 (M4)            | T-163, T-164               | Real native study, semantic checkpoint recovery and first-launch offline lessons/declared audio        |
| W49 (first release) | T-165–T-167                | Credential-gated signed artifacts, first upgrade evidence and owner internal-testing handoff           |

Three risk-first tasks can start now with disjoint primary files:

| Task  | Primary implementation area                                                                                | Shared-file policy                         |
| ----- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| T-142 | `src/infrastructure/fsrs/adapter/`, `tools/learning/inspect-fsrs.ts`, `tests/fixtures/learning/fsrs/`      | No package manifest or shared barrel edits |
| T-143 | `src/domain/time-policy/`, `tools/learning/inspect-eligibility.ts`, `tests/fixtures/learning/eligibility/` | No package manifest or shared barrel edits |
| T-144 | `src/domain/attempt-scoring/`, `tools/learning/inspect-scoring.ts`, `tests/fixtures/learning/scoring/`     | No package manifest or shared barrel edits |

Validation commands:

- `node --test docs/tasks/T-011-plan-m3-m4.test.mjs`: AC1 checks every unchanged plan ref
  in the 26 new ordinary tasks with the plan done; AC2 checks bounded scope/goals and
  Given/When/Then test types; AC3 checks explicit native ownership/device criteria; AC4
  checks real acyclic/nonredundant dependencies, three ready tasks and disjoint file ownership.
  Additional assertions check T-120/repository handoffs, web/native isolation and risk contracts.
- `npm run check:tasks`: strict full-backlog coverage with the plan done.
- `npm run verify` and `npm run test:e2e:web`: required repository regression gates.

Executable structural evidence supplements the plan-red-team review of slice size and actual
semantics. New tasks remain unchecked until implemented. Native device runs are CI-only;
actual Play install/track upgrade requires owner access, artifacts and separate distribution
authorization. Missing signing/Play credentials or a preceding release must remain explicit
blockers, never simulated success. Full content/media operations, M6 task UI, M7 support editors,
M8 optimizer/experiments, M9 updates and M10 release/ABI hardening remain with later plans.
