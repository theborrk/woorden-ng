---
id: T-010
title: Plan the tasks for milestones M1 and M2
status: done
size: M
depends_on: [T-004, T-005, T-006]
type: plan
refs:
  [
    W05,
    W06,
    W07,
    W09,
    W47,
    W50,
    W51,
    T32,
    T35,
    T36,
    T37,
    T61,
    T62,
    T63,
    T64,
    T66,
    T71,
    T72,
    T73,
    I02,
    I08,
    I12,
    I14,
    I18,
    I19,
    I20,
    I22,
    I23,
    F06,
    F10,
    F14,
  ]
---

## Goal

The work packages of M1 (modular foundation and durable contracts) and M2 (identity and recovery before content changes) are broken down into small, testable task files, so Codex can
implement them one pull request at a time and the ledger shows real tasks instead of this plan.

## Context

- Blueprint: Section 7 (domain model), 8 (transactions), 17.1, 17.2 and 17.4 (persistence and backups), 18.4, 20.2 (W51), 22.3 and 22.4a, W05–W09 and W47–W51 in section 24; ADR 0003; the M0 spike results in `docs/architecture/spikes/`
- Task format and traceability: `docs/tasks/README.md`; backlog review checklist:
  `docs/agents/plan-red-team.md`

## Scope

In:

- W05 schemas and stable ID conventions; W06 shared repositories with Dexie and native SQLite
  adapters, transactions, projections and a local profile (T61–T63); W07 seed extraction into
  immutable IDs and senses, with legacy IDs as provenance only (T32); W09 the new backup format,
  import, staging and restore (T35–T37, T64, T66, T71).
- The M1–M2 parts of W47 (native SQLite, files, lifecycle, backup picker; T72), W50 (the shared
  repository suite and backup interoperability) and W51 (provider-neutral session and observation
  schemas; T73).
- W08 is out of scope (ADR 0003): no task may import the old app's progress, settings or custom
  words.
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

## Planned slices and acceptance evidence

T-123–T-141 implement this plan. T-110 remains the entry schema owner; T-109 remains the legacy
audit/registry owner. T-128 depends on both and extends their contracts for W05/W07 rather than
repeating extraction, validation, review or compilation. ADR 0005 governs content status; no task
imports old-app learner data or treats source/structural checks as language approval.

| Work        | New tasks                                | Observable result                                                                     |
| ----------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| W05         | T-123, T-124, T-128                      | Runtime/backup inspection and normalized catalog using T-110                          |
| W06         | T-126, T-127, T-129, T-130, T-132, T-133 | Durable profiles, atomic command/query slice, shared conformance and recovery         |
| W07         | T-128                                    | All legacy rows browsable with stable sense identity and original RU                  |
| W09         | T-124, T-134–T-141                       | Portable snapshot/export, bounded preview, all three restore modes and verified media |
| W47 (M1–M2) | T-127, T-130, T-131, T-135, T-139, T-140 | Native DB, lifecycle checkpoints, durable files and scoped backup access              |
| W50 (M2)    | T-130, T-132, T-141                      | Real native repository equivalence and PWA → Android → PWA transfer                   |
| W51         | T-125                                    | Provider-neutral lesson/observation validation and future boundary documentation      |

The first three tasks can start now with disjoint primary files:

| Task  | Primary implementation area                                                                                                                                    | Shared-file policy                         |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| T-123 | `src/contracts/runtime/`, `tools/contracts/inspect-runtime.ts`, `tests/fixtures/runtime/`                                                                      | No package manifest or shared barrel edits |
| T-124 | `src/contracts/backup/`, `tools/contracts/inspect-backup.ts`, `tests/fixtures/backup-manifests/`                                                               | No package manifest or shared barrel edits |
| T-125 | `src/contracts/external-practice/`, `tools/contracts/inspect-external-practice.ts`, `tests/fixtures/external-practice/`, `docs/contracts/external-practice.md` | No package manifest or shared barrel edits |

Validation commands:

- `node --test docs/tasks/T-010-plan-m1-m2.test.mjs`: AC1 checks every plan ref in new ordinary
  tasks, independently of existing coverage; AC2 checks bounded task format and Given/When/Then
  test types; AC3 checks explicit native isolation/device criteria; AC4 checks real acyclic,
  non-redundant dependencies, three ready tasks and disjoint declared primary files. It also
  checks T-128's T-109/T-110 dependency handoff.
- `npm run check:tasks`: strict full-backlog coverage with this plan done.
- `npm run verify` and `npm run test:e2e:web`: required repository regression gates.

Automated structural evidence supplements the plan-red-team review: each slice exposes a real
inspector, profile/catalog/recovery flow or executable production-adapter result; native mocks
cannot satisfy device criteria. Future task criteria remain unchecked until implementation.
Full grading/study/audio lifecycle work, reminders, pack downloads, signed updates/ABI checks and
physical-device release verification remain with the later milestone plans. W50 is not complete
merely because its M2 portion is allocated here.
