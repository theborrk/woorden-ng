---
id: T-193
title: Choose, reject and replace optional memory supports
status: todo
size: M
depends_on: [T-160, T-190]
type: task
refs: [W26, F05, T05, T06]
---

## Goal

A learner can select one optional support, reject it or choose none without changing word identity.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- EN/PL support editor/library with explicit provenance, confusion contrast links and one chosen study support. Reuse RequestHelp/RecordExposure/RepairItem; opening answer-bearing supports records exposure, while remembered hooks need no penalty.

Out (do not do in this task):

- Native plugin/permission changes, cloud services, runtime pack updates or unrelated study UI.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given a selected support, when replaced or marked does not help, then stable sense identity/history survives and none remains available (e2e).
- [ ] AC2: Given a mnemonic opened before response versus a primary picture cue, when answered, then assisted versus independent semantics remain distinct (unit and e2e).
- [ ] AC3: Given a failed save, when editing, then the draft remains and selection is not reported saved (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/supports/editor/`, `tests/integration/m7-m8/t-193/`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
