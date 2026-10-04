---
id: T-205
title: Export qualified optimizer data and invoke local fitting
status: todo
size: M
depends_on: [T-191, T-153]
type: task
refs: [W31, F09, T30]
---

## Goal

A contributor can export a reproducible fitting dataset and run an optional local optimizer with diagnostics.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Versioned selection excludes technical/invalid/duplicate/undone/direct-copy ratings while retaining help/exposure covariates and actual intervals. Train/holdout split by stable grouping; pin a verified local optimizer invocation, reject insufficient data and retain current parameters on failure. No server, provider or paid service.

Out (do not do in this task):

- Native plugin/permission changes, cloud services, runtime pack updates or unrelated study UI.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given mixed history, when exported, then excluded events and selection rule/version are reproducible with source/help covariates (unit and integration).
- [ ] AC2: Given enough valid observations, when local fitting runs, then candidate parameter version and holdout diagnostics are produced without changing active state (integration).
- [ ] AC3: Given insufficient data, failed process or invalid parameters, when invoked, then fitting is refused and current parameters remain unchanged (integration).

## Notes for the implementer

Native work: no. Primary files: `tools/learning/optimizer/`, `tests/integration/m7-m8/t-205/`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
