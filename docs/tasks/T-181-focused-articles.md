---
id: T-181
title: Study focused articles without hidden answer leaks
status: todo
size: M
depends_on: [T-159, T-173]
type: task
refs: [W22, F02, T12, T45]
---

## Goal

A learner can practice an eligible noun article and see balanced de/het diagnostics.

## Context

- Blueprint §§7, 10, 14–15, 22.3, W18–W25; `docs/architecture/README.md`.
- ADR 0003 and ADR 0005 (sample-check policy supersedes human-review wording).
- T-012 handoff; reuse T-100–T-122 and T-168–T-171 rather than duplicating their tooling.

## Scope

In:

- Neutral noun prompt, keyboard/screen-reader choices, scoped explanation after lock, accepted article variants and separate article progress. Suppress answer-bearing colors, audio, labels and hidden DOM; show per-article denominators.

Out (do not do in this task):

- Native plugins/permissions, recording, runtime downloads/updates (M9), or unrelated UI redesign.
- New generators, automatic linguistic approval or competing identity/eligibility contracts.

## Acceptance criteria

- [ ] AC1: Given an article prompt, when inspected by keyboard and accessible tree before response, then no article-bearing cue exists in color, labels, audio or hidden DOM (e2e).
- [ ] AC2: Given correct noun/wrong article, when committed, then article feedback/progress is separate and there is no second lexical schedule update (unit and e2e).
- [ ] AC3: Given unequal de/het coverage, when recap opens, then each article shows its own tested denominator and supported rule/exception (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/study/article/`, `tests/integration/m5-m6/t-181/`.
Reuse established schemas, IDs, ports and command transactions. No runtime AI, paid service,
remote ASR, legacy progress migration or fabricated review. Synthetic test fixtures never authorize
production content. Shared UI uses EN/PL resources and screenshot-backed e2e flows.

## Notes for the reviewer

Check exact hash-bound evidence, failures and task/cue identity. Stay within one S/M slice;
external language/visual/phone QA requires recorded real results, never simulated success.
