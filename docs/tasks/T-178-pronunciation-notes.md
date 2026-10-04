---
id: T-178
title: Inspect pronunciation and learner-language notes
status: todo
size: M
depends_on: [T-118, T-105]
type: task
refs: [W20, W21, F07, F08, T43]
---

## Goal

A contributor can inspect pronunciation metadata and separate source support from actual audio QA.

## Context

- Blueprint §§7, 10, 14–15, 22.3, W18–W25; `docs/architecture/README.md`.
- ADR 0003 and ADR 0005 (sample-check policy supersedes human-review wording).
- T-012 handoff; reuse T-100–T-122 and T-168–T-171 rather than duplicating their tooling.

## Scope

In:

- Bind syllables, stress, IPA, separate noun/article/example/form assets and approximate PL aid to sources and hashes; export missing review blockers. No synthesized pronunciation facts or invented QA.

Out (do not do in this task):

- Native plugins/permissions, recording, runtime downloads/updates (M9), or unrelated UI redesign.
- New generators, automatic linguistic approval or competing identity/eligibility contracts.

## Acceptance criteria

- [ ] AC1: Given sourced IPA and approved word/form recordings, when inspected, then exact target identity, stress and separate utterance references remain visible (integration).
- [ ] AC2: Given a PL pronunciation aid, when displayed, then approximation and provenance are explicit and do not replace Dutch listening (unit).
- [ ] AC3: Given a checksum-only candidate, when evaluated, then pronunciation approval is absent and dependent tasks remain blocked (unit).

## Notes for the implementer

Native work: no. Primary files: `tools/content/pronunciation-notes/`, `tests/integration/m5-m6/t-178/`.
Reuse established schemas, IDs, ports and command transactions. No runtime AI, paid service,
remote ASR, legacy progress migration or fabricated review. Synthetic test fixtures never authorize
production content. Shared UI uses EN/PL resources and screenshot-backed e2e flows.

## Notes for the reviewer

Check exact hash-bound evidence, failures and task/cue identity. Stay within one S/M slice;
external language/visual/phone QA requires recorded real results, never simulated success.
