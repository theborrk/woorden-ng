---
id: T-010
title: Plan the tasks for milestones M1 and M2
status: todo
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
