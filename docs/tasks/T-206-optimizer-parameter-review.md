---
id: T-206
title: Inspect, apply and roll back fitted parameter candidates
status: todo
size: M
depends_on: [T-205, T-202]
type: task
refs: [W31, F09, T30, I15]
---

## Goal

A learner can compare a fitted candidate and explicitly apply or roll it back with traceable versions.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Candidate review with holdout diagnostics, uncertainty/selection limits, explicit apply and parameter history using existing replay/rollback API. Retention/workload tradeoff, failed apply recovery, no automatic efficacy claim or rewriting immutable events.

Out (do not do in this task):

- Native plugin/permission changes, cloud services, runtime pack updates or unrelated study UI.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given a valid fitted candidate, when reviewed/applied, then version and diagnostics are retained and future transitions use the selected version (integration and e2e).
- [ ] AC2: Given invalid/poorly supported candidate or failed write, when applied, then active parameters and saved history remain unchanged (integration and e2e).
- [ ] AC3: Given an applied candidate, when rolled back, then prior supported parameters are restored through replay policy without erasing events and reason remains inspectable (integration and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/progress/parameters/`, `tests/integration/m7-m8/t-206/`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
