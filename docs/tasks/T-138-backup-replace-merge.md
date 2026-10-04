---
id: T-138
title: Replace or merge a profile with an explicit conflict preview
status: todo
size: M
depends_on: [T-137]
type: task
refs: [W09, T35, T36, I08, I12, F10]
---

## Goal

A learner can explicitly replace a selected profile after preserving its recovery copy, or merge
compatible new-app history with an inspectable conflict report instead of overwriting differing events.

## Context

- Blueprint §17.2's three import modes; §8 parent/revision/base hashes and projections.
- T-137 supplies safe new-profile staging/activation; these are local backup operations, not sync.

## Scope

In:

- Shared compatibility/dedup/conflict policy and web replace/merge confirmation UI.
- Before replace, generate/verify a recoverable old-profile backup and retain it through successful
  activation. Merge identical ID/hash events once; reject conflicting IDs, task branches, versions
  or overrides with a report and preserve both source archives/previous state for resolution.
- Rebuild projections only from compatible ordered history using the existing projection functions;
  no added grade or changed ID. Preview exact settings/media/profile effects before activation.

Out (do not do in this task):

- Automatic cross-device reconciliation, last-writer-wins, unsupported scheduler replay or native adapters.
- Learning undo/correction, old-app imports, automatic mastery copied into split senses.

## Acceptance criteria

- [ ] AC1: Given a selected profile, when replacement is confirmed, then a verified recovery copy
      exists before activation and a failed copy/activation leaves the old profile intact (integration and e2e).
- [ ] AC2: Given identical history imported repeatedly, when compatible merge is chosen, then IDs,
      counts and projections deduplicate exactly and no scheduler transition is applied twice (integration and e2e).
- [ ] AC3: Given the same ID with another hash or divergent parent/base history, when previewed,
      then an explicit conflict blocks activation without losing either input or changing live data (unit and e2e).
- [ ] AC4: Given compatible added events/media and unchanged sense identity, when merged, then
      verified media and rebuilt state match ordered history while original content/event IDs remain intact (integration).

## Notes for the implementer

Native work: no. Primary files: `src/application/backup/merge/`,
`src/features/settings/backup/import-modes/`, `tests/integration/backup/merge.test.ts`.
Define compatibility conservatively: an unverified scheduling branch cannot be merged merely because
numeric revisions match. Conflicted imports can still use the existing explicit new-profile mode.
No need to wait on W10 to deduplicate identical validated histories; unsupported replay must be rejected.

## Notes for the reviewer

Replace requires an actual recoverable copy. Merge is bounded compatible-history import, not the
deferred sync service. Check failure before every destructive pointer change.
