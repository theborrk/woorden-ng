---
id: T-182
title: Study listening with replay and transcript help
status: todo
size: M
depends_on: [T-159]
type: task
refs: [W23, F02, F07, T08, T48]
---

## Goal

A learner can replay Dutch primary audio and answer its meaning without a transcript leak.

## Context

- Blueprint §§7, 10, 14–15, 22.3, W18–W25; `docs/architecture/README.md`.
- ADR 0003 and ADR 0005 (sample-check policy supersedes human-review wording).
- T-012 handoff; reuse T-100–T-122 and T-168–T-171 rather than duplicating their tooling.

## Scope

In:

- Explicit audio-word/audio-sentence contracts, gesture playback and replay semantics; transcript/translation reveal is assistance. Missing/failed/interrupted playback permits written alternative or ungraded skip; no remote fallback.

Out (do not do in this task):

- Native plugins/permissions, recording, runtime downloads/updates (M9), or unrelated UI redesign.
- New generators, automatic linguistic approval or competing identity/eligibility contracts.

## Acceptance criteria

- [ ] AC1: Given eligible listening audio, when replayed before a locked response, then replay stays a primary cue and transcript reveal is recorded as help (e2e).
- [ ] AC2: Given no Dutch voice, corrupt download or playback interruption, when continued, then no memory failure is recorded and written practice remains usable (unit and e2e).
- [ ] AC3: Given a changed card or resume, when playback is canceled, then the target does not autoplay and no transcript appears in accessible markup (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/study/listening/`, `tests/integration/m5-m6/t-182/`.
Reuse established schemas, IDs, ports and command transactions. No runtime AI, paid service,
remote ASR, legacy progress migration or fabricated review. Synthetic test fixtures never authorize
production content. Shared UI uses EN/PL resources and screenshot-backed e2e flows.

## Notes for the reviewer

Check exact hash-bound evidence, failures and task/cue identity. Stay within one S/M slice;
external language/visual/phone QA requires recorded real results, never simulated success.
