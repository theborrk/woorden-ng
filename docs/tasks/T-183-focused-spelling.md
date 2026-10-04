---
id: T-183
title: Study strict spelling from an explicit audio cue
status: todo
size: M
depends_on: [T-182]
type: task
refs: [W23, F02, T08, T11]
---

## Goal

A learner can practice an explicitly supported spelling form and get safe mismatch feedback.

## Context

- Blueprint §§7, 10, 14–15, 22.3, W18–W25; `docs/architecture/README.md`.
- ADR 0003 and ADR 0005 (sample-check policy supersedes human-review wording).
- T-012 handoff; reuse T-100–T-122 and T-168–T-171 rather than duplicating their tooling.

## Scope

In:

- Audio/form cue with exact accepted spelling contract; record spelling separately, letter help explicitly assisted and correction through existing API. No unrestricted edit-distance grading.

Out (do not do in this task):

- Native plugins/permissions, recording, runtime downloads/updates (M9), or unrelated UI redesign.
- New generators, automatic linguistic approval or competing identity/eligibility contracts.

## Acceptance criteria

- [ ] AC1: Given an accepted normalized form, when typed after audio, then one spelling-task grade saves (e2e).
- [ ] AC2: Given a one-character real word or meaningful vowel/ending change, when submitted, then a typo suggestion cannot silently count as correct (unit and e2e).
- [ ] AC3: Given requested letter help or unavailable audio, when continued, then the attempt is assisted or ungraded respectively, with a supported alternative (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/study/spelling/`, `tests/integration/m5-m6/t-183/`.
Reuse established schemas, IDs, ports and command transactions. No runtime AI, paid service,
remote ASR, legacy progress migration or fabricated review. Synthetic test fixtures never authorize
production content. Shared UI uses EN/PL resources and screenshot-backed e2e flows.

## Notes for the reviewer

Check exact hash-bound evidence, failures and task/cue identity. Stay within one S/M slice;
external language/visual/phone QA requires recorded real results, never simulated success.
