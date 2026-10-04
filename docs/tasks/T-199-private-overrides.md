---
id: T-199
title: Edit private overrides and split senses without moving history
status: todo
size: M
depends_on: [T-198, T-138]
type: task
refs: [W28, F05, F09]
---

## Goal

A learner can correct a private translation or example and keep prior history interpretable.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Personal override layer preserves curated original and revisions; explicit sense split/merge with aliases/tombstones and retained prompt context. Changed cue language/task contract never relabels old evidence; backup round trip.

Out (do not do in this task):

- Native plugin/permission changes, cloud services, runtime pack updates or unrelated study UI.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given a spelling/translation override, when saved/reordered/exported, then IDs and retained historical prompts stay attached to the original history (integration and e2e).
- [ ] AC2: Given a materially different meaning split, when confirmed, then new senses receive no copied measured mastery and retired identities remain resolvable (integration).
- [ ] AC3: Given backup replace/merge, when restored, then overrides, conflicts and private opt-in survive without overwriting curated review status (integration).

## Notes for the implementer

Native work: no. Primary files: `src/application/personal-overrides/`, `tests/integration/m7-m8/t-199/`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
