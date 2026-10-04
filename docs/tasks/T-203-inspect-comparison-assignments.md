---
id: T-203
title: Inspect stable personal comparison assignments
status: todo
size: M
depends_on: [T-123]
type: task
refs: [W31, F09]
---

## Goal

A contributor can reproduce stratified support conditions without changing an item assignment.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Injected seeded assignment across comparable unfamiliar items with difficulty/concreteness strata, explicit consent, outcome window and intervening-review policy. Inspect fixed assignments, crossover/attrition and equal-opportunity diagnostics.

Out (do not do in this task):

- Native plugin/permission changes, cloud services, runtime pack updates or unrelated study UI.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given the same item set/seed, when reordered or reopened, then stratified assignments remain fixed by stable identity (unit and integration).
- [ ] AC2: Given changed support or missing probe, when analyzed, then crossover/attrition and unequal time are explicit instead of silently reassigned (unit).
- [ ] AC3: Given no consent to a no-review restriction, when planned, then normal feedback/reviews remain available (integration).

## Notes for the implementer

Native work: no. Primary files: `tools/learning/comparison-inspector/`, `tests/integration/m7-m8/t-203/`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.
Run directly with Node; leave package manifests and shared barrels untouched.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
