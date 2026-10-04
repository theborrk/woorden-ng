---
id: T-187
title: Practice scripted situations without simulated conversation
status: todo
size: M
depends_on: [T-185, T-186]
type: task
refs: [W25, F02, F04, T26, T27, I07]
---

## Goal

A learner can complete a small reviewed situation through explicit turns and honest evidence.

## Context

- Blueprint §§7, 10, 14–15, 22.3, W18–W25; `docs/architecture/README.md`.
- ADR 0003 and ADR 0005 (sample-check policy supersedes human-review wording).
- T-012 handoff; reuse T-100–T-122 and T-168–T-171 rather than duplicating their tooling.

## Scope

In:

- Bounded reviewed scenario turns with EN/PL situation cues, eligible sense/form targets and existing typed/self-report contracts. Integrate activation/variant rotation, record answer exposure between turns and finish explicitly.

Out (do not do in this task):

- Native plugins/permissions, recording, runtime downloads/updates (M9), or unrelated UI redesign.
- New generators, automatic linguistic approval or competing identity/eligibility contracts.

## Acceptance criteria

- [ ] AC1: Given a reviewed shopping/housing situation, when turns complete, then each supported response records its actual task/variant and an explicit finish action (e2e).
- [ ] AC2: Given earlier turn reveals a later target, when the next turn is selected, then exposure-aware deferral/practice applies rather than independent success (integration and e2e).
- [ ] AC3: Given missing translation or grading support, when a turn opens, then it stays blocked or self-graded with no fabricated answer (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/study/situations/`, `tests/integration/m5-m6/t-187/`.
Reuse established schemas, IDs, ports and command transactions. No runtime AI, paid service,
remote ASR, legacy progress migration or fabricated review. Synthetic test fixtures never authorize
production content. Shared UI uses EN/PL resources and screenshot-backed e2e flows.

## Notes for the reviewer

Check exact hash-bound evidence, failures and task/cue identity. Stay within one S/M slice;
external language/visual/phone QA requires recorded real results, never simulated success.
