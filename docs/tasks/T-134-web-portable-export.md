---
id: T-134
title: Export a consistent portable backup from the PWA
status: todo
size: M
depends_on: [T-124, T-129, T-128]
type: task
refs: [W09, T35, T71, F10, I22]
---

## Goal

A PWA learner can download a complete point-in-time `.woorden.zip` backup, or deliberately choose
a progress-only export with clear personal-media omissions.

## Context

- Blueprint §§17.2, 18.4; T-124 manifest contract, T-129 logical repositories and T-128 retained content.
- Backups cover new-app data only; ADR 0003 excludes legacySnapshots and v1 learner imports.

## Scope

In:

- Shared logical snapshot/export service, BackupFileAccess and MediaStore ports with browser adapters.
- Snapshot mutable state and watermark in one read transaction, then stream immutable events to that
  watermark. Pin referenced content/media during export and release pins on success/cancellation.
- Full profile/settings/enrollment/task/state/event/parameter/override/app-migration-journal inventory,
  retained content needed for history, personal media with hashes, optional downloaded media.
- ZIP compression/checksums outside DB transactions; Settings export controls, progress/cancellation
  and honest generated/download-handoff status. A download cannot prove the user's disk write succeeded.

Out (do not do in this task):

- Import/restore/merge, native file plugins or media editing/recording UI from later milestones.
- Physical DB dumps, omitted-personal-media recovery claims or old-app storage access.

## Acceptance criteria

- [ ] AC1: Given concurrent writes during export, when a backup is opened by the test reader, then
      mutable state/events form one consistent watermark snapshot with retained content and exact hashes (integration).
- [ ] AC2: Given personal-media fixtures and a full export, when downloaded, then all referenced
      personal bytes are included and verified; progress-only export names omissions before confirmation (integration and e2e).
- [ ] AC3: Given cancellation or export/read/handoff failure, when export ends, then live data is
      unchanged, pins are released and the UI never claims a completed destination save (integration and e2e).
- [ ] AC4: Given historical event device IDs and current installation/platform settings, when
      exported, then history is preserved while destination-local fields are excluded (integration).

## Notes for the implementer

Native work: no. Primary files: `src/application/backup/export/`, `src/application/ports/backup.ts`,
`src/platform/web/files/`, `src/platform/web/media/`, `src/features/settings/backup/`, `tests/integration/backup/`.
The architecture calls for a maintained streaming ZIP library; justify its license/size and pin it.
Test media via repository fixtures, not a fabricated recorder/photo production feature.

## Notes for the reviewer

No network/compression awaits inside the snapshot transaction. Retain immutable revisions, not
just dead version IDs. Browser handoff wording must reflect its observable guarantees.
