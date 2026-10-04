---
id: T-202
title: Adjust active workload with inspectable reversible reasons
status: todo
size: M
depends_on: [T-201, T-158]
type: task
refs: [W30, F09, T24, T25, T30, I15]
---

## Goal

A learner can accept or revert a bounded active-load recommendation while preserving manual choices.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Extend initial M4 introduction adaptation to active-task/time burden and too-much signals, versioned reason records and cooldown. Reuse thresholds and sufficient delayed samples; never block all new concepts because one item struggles.

Out (do not do in this task):

- Native plugin/permission changes, cloud services, runtime pack updates or unrelated study UI.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given one-concept daily history and sufficient eligible observations, when reconsidered, then progress can yield a bounded recommendation without a two-word prerequisite (unit and e2e).
- [ ] AC2: Given tiny/noisy/assisted data or high burden, when evaluated, then conservative hold/decrease explains counts and respects cooldown (unit and e2e).
- [ ] AC3: Given postponement, manual zero/high cap or rejected recommendation, when changed, then actual histories remain and undo/disable restores manual controls (integration and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/application/active-load/`, `tests/integration/m7-m8/t-202/`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
