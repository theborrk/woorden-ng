---
id: T-186
title: Activate focused families within live workload budgets
status: todo
size: M
depends_on: [T-157, T-174]
type: task
refs: [W25, F02, F04, T26, T27, I07]
---

## Goal

A learner can enable a supported family without unexpected new workload or inherited mastery.

## Context

- Blueprint §§7, 10, 14–15, 22.3, W18–W25; `docs/architecture/README.md`.
- ADR 0003 and ADR 0005 (sample-check policy supersedes human-review wording).
- T-012 handoff; reuse T-100–T-122 and T-168–T-171 rather than duplicating their tooling.

## Scope

In:

- Activation preview with concept versus active-task/time budgets and per-locale eligibility; integrate existing planner and sibling separation. Variants rotate within one task; cue-language/family changes retain independent evidence.

Out (do not do in this task):

- Native plugins/permissions, recording, runtime downloads/updates (M9), or unrelated UI redesign.
- New generators, automatic linguistic approval or competing identity/eligibility contracts.

## Acceptance criteria

- [ ] AC1: Given unchanged concept count and added task variants, when activation is proposed, then active-task/time capacity constrains the result (unit and e2e).
- [ ] AC2: Given an already mastered translation task, when listening or article is enabled, then no measured mastery/scheduler state is copied (integration).
- [ ] AC3: Given an answer-sharing sibling exposed today, when selected, then production is deferred to the next study day with the exposure reason preserved (integration).

## Notes for the implementer

Native work: no. Primary files: `src/application/task-activation/`, `tests/integration/m5-m6/t-186/`.
Reuse established schemas, IDs, ports and command transactions. No runtime AI, paid service,
remote ASR, legacy progress migration or fabricated review. Synthetic test fixtures never authorize
production content. Shared UI uses EN/PL resources and screenshot-backed e2e flows.

## Notes for the reviewer

Check exact hash-bound evidence, failures and task/cue identity. Stay within one S/M slice;
external language/visual/phone QA requires recorded real results, never simulated success.
