---
id: T-188
title: Practice observed confusions in varied contexts
status: todo
size: M
depends_on: [T-187]
type: task
refs: [W25, F02, F04, T27]
---

## Goal

A learner can contrast an observed confusion then test a varied context later.

## Context

- Blueprint §§7, 10, 14–15, 22.3, W18–W25; `docs/architecture/README.md`.
- ADR 0003 and ADR 0005 (sample-check policy supersedes human-review wording).
- T-012 handoff; reuse T-100–T-122 and T-168–T-171 rather than duplicating their tooling.

## Scope

In:

- Short reviewed contrasts linked to actual confused-with IDs, compatible example rotation and exposure tracking. Do not force every synonym together or create a schedule for each sentence.

Out (do not do in this task):

- Native plugins/permissions, recording, runtime downloads/updates (M9), or unrelated UI redesign.
- New generators, automatic linguistic approval or competing identity/eligibility contracts.

## Acceptance criteria

- [ ] AC1: Given repeated confusion of two senses, when repair is opened, then a reviewed discriminating contrast is offered with explicit source/target (e2e).
- [ ] AC2: Given later compatible examples, when practice rotates, then one task schedule persists and exposures prevent multiple independent successes from one sentence (integration).
- [ ] AC3: Given no eligible contrast, when repair runs, then another supported repair is offered without inventing content (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/study/confusion-contexts/`, `tests/integration/m5-m6/t-188/`.
Reuse established schemas, IDs, ports and command transactions. No runtime AI, paid service,
remote ASR, legacy progress migration or fabricated review. Synthetic test fixtures never authorize
production content. Shared UI uses EN/PL resources and screenshot-backed e2e flows.

## Notes for the reviewer

Check exact hash-bound evidence, failures and task/cue identity. Stay within one S/M slice;
external language/visual/phone QA requires recorded real results, never simulated success.
