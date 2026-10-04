---
id: T-185
title: Study discontinuous contextual completion
status: todo
size: M
depends_on: [T-184]
type: task
refs: [W24, F02, T44]
---

## Goal

A learner can complete multiple ordered gaps for one sense/form and inspect feedback.

## Context

- Blueprint §§7, 10, 14–15, 22.3, W18–W25; `docs/architecture/README.md`.
- ADR 0003 and ADR 0005 (sample-check policy supersedes human-review wording).
- T-012 handoff; reuse T-100–T-122 and T-168–T-171 rather than duplicating their tooling.

## Scope

In:

- Render T-174 span assembly with explicit context, locked multi-gap response and ordered highlight after feedback. Common sentence variants must be evidenced or self-graded under ADR 0005; no sentence-per-schedule multiplication.

Out (do not do in this task):

- Native plugins/permissions, recording, runtime downloads/updates (M9), or unrelated UI redesign.
- New generators, automatic linguistic approval or competing identity/eligibility contracts.

## Acceptance criteria

- [ ] AC1: Given a discontinuous separable verb, when gaps are completed, then assembly and highlighting match the stored form with one committed attempt (e2e).
- [ ] AC2: Given overlapping/ambiguous spans or wrong-context alternatives, when selected/answered, then the task is blocked or judged by its precise contract (unit and e2e).
- [ ] AC3: Given whole-sentence production without reviewed variants, when answered, then labelled self-assessment is required (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/study/cloze/`, `tests/integration/m5-m6/t-185/`.
Reuse established schemas, IDs, ports and command transactions. No runtime AI, paid service,
remote ASR, legacy progress migration or fabricated review. Synthetic test fixtures never authorize
production content. Shared UI uses EN/PL resources and screenshot-backed e2e flows.

## Notes for the reviewer

Check exact hash-bound evidence, failures and task/cue identity. Stay within one S/M slice;
external language/visual/phone QA requires recorded real results, never simulated success.
