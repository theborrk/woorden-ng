---
id: T-139
title: Deliver native backups through scoped system file access
status: todo
size: M
depends_on: [T-135, T-130]
type: task
refs: [W09, W47, T35, T71, F14, I22]
---

## Goal

An Android learner can export a logical backup to a chosen system destination, retain a valid copy
after cancellation/failure, and choose a scoped import document for validation.

## Context

- Blueprint §§17.2, 18.4; shared export/FileAccess ports from T-134, durable native media from T-135.
- Native source snapshots use T-130 repositories, never a copied SQLite file.

## Scope

In:

- Maintained system document picker/save/share adapter with scoped URI access and minimum permissions.
- Shared consistent export service wired to SQLite/native MediaStore; private temporary backup retained
  until destination delivery is confirmed. Distinguish generated, handed off, delivered and canceled states.
- Scoped import read/cancellation contract, delivered-file validation, recoverable interrupted exports
  and Settings flow. Sharing without delivery acknowledgement must remain labelled as handoff.

Out (do not do in this task):

- Restore activation (T-140), broad external-storage permission, provider services or signing changes.
- Reporting success solely because a private temporary ZIP was written or a share sheet opened.

## Acceptance criteria

- [ ] AC1: Given a native profile with personal media, when saved to a selected system destination,
      then the destination file validates as v2 with exact logical data/hashes and truthful delivery status (device test).
- [ ] AC2: Given picker/share cancellation or destination write failure, when exporting, then no
      successful-save message appears and current DB plus the valid private backup remain intact (device test).
- [ ] AC3: Given process termination during destination writing, when restarted, then partial output
      is not successful and the retained copy can be retried without duplicate/lost history (device test).
- [ ] AC4: Given scoped document selection or denial/cancellation, when importing for validation,
      then only the selected URI is read and denial/cancellation leaves live profiles unchanged (device test).

## Notes for the implementer

Native work: yes. Primary files: `src/platform/android/backup/`, `src/targets/android.ts`,
`src/features/settings/backup/`, `android/`, `e2e-android/backup-files.spec.ts`.
Select/pin/justify a maintained plugin or focused native bridge; document its actual delivery/URI
guarantees, run android:sync and commit changes. Native resource/permission edits are in scope;
protected signing/version/application-ID files and workflows remain out. Exercise real scoped storage
in CI; deterministic fault injection supplements actual successful destination readback.

## Notes for the reviewer

T71 requires cancellation and failure evidence at the destination boundary. Web fallback remains
T-134's download/upload implementation. No OS cloud restore or automatic sync claim.
