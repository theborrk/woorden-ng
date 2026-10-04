---
id: T-190
title: Inspect support meaning, provenance and cue roles
status: todo
size: M
depends_on: [T-110]
type: task
refs: [W26, F05, T05, T06]
---

## Goal

A contributor can distinguish optional memory help from a task primary cue.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Inspect support language, intended sense/form connection, invented versus morphological/historical provenance and offensive/irrelevant or answer-leaking descriptions. Demonstrate none/reject/replace decisions without publishing language approval.

Out (do not do in this task):

- Native plugin/permission changes, cloud services, runtime pack updates or unrelated study UI.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given a referent image primary cue and a requested mnemonic image, when inspected, then the former can be independent naming and the latter pre-response assistance (unit and integration).
- [ ] AC2: Given no useful association, when inspected, then none is valid without blocking an otherwise eligible task (unit).
- [ ] AC3: Given sourced versus invented connections, when exported, then their origins and missing review remain explicit (integration).

## Notes for the implementer

Native work: no. Primary files: `tools/content/support-inspector/`, `tests/integration/m7-m8/t-190/`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.
Run directly with Node; leave package manifests and shared barrels untouched.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
