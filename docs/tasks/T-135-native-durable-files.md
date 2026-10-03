---
id: T-135
title: Verify staged backup media in durable native files
status: todo
size: M
depends_on: [T-134, T-127]
type: task
refs: [W47, W09, T66, I20, F14]
---

## Goal

Android can retain hash-verified personal backup media across restart and show whether file staging
is complete or interrupted before any imported profile becomes active.

## Context

- Blueprint §§17.1/17.2, 18.4; shared MediaStore port from T-134 and native storage from T-127.
- Files and database activation do not share a transaction; T-140 owns their activation journal.

## Scope

In:

- Maintained native filesystem adapter: persistent app-private personal/verified media, disposable
  cache staging, bounded chunked writes, checksums and safe path resolution.
- Reopen/verify staged files, report incomplete/missing content in Settings storage diagnostics and
  clean abandoned staging without deleting referenced active or pinned-export files.
- Explicit Android cloud-backup/device-transfer exclusions for private DB/files where supported,
  with residual OS transfer limitations documented. Sync plugin/native resource changes.

Out (do not do in this task):

- System document picker/share (T-139), restore pointer activation (T-140), pack downloads or recording.
- Broad external-storage permission, signed distribution or guarantees after uninstall/clear-data.

## Acceptance criteria

- [ ] AC1: Given private media bytes, when staged/verified and the process restarts, then verified
      persistent files retain exact hashes while incomplete writes remain unavailable for activation (device test).
- [ ] AC2: Given termination during a chunk write or a missing/checksum-mismatched file, when
      reopened, then diagnostics show incomplete status and previous referenced files remain readable (device test).
- [ ] AC3: Given orphan staging and files pinned by export/active data, when cleanup runs, then
      only unreferenced staging is removed (unit and device test).
- [ ] AC4: Given the APK's backup/data-extraction configuration, when inspected on the CI device,
      then private DB/files are excluded for supported backup/transfer modes and documented residual limits are visible (integration and device test).

## Notes for the implementer

Native work: yes. Primary files: `src/platform/android/files/`, `src/platform/android/media/`,
`src/features/settings/storage-files/`, `android/app/src/main/AndroidManifest.xml`,
`android/app/src/main/res/xml/`, `e2e-android/files.spec.ts`, `docs/storage/native-files.md`.
Select/pin/justify required filesystem plugins, run android:sync and commit Android changes. No signing,
application ID or protected workflow edits. Device tests execute only in CI; config inspection alone
does not establish every OEM's cloud/device-transfer behavior.

## Notes for the reviewer

Persistent app files differ from cache. An interrupted file must not look verified, and cleanup
must respect the prior active namespace. No full OS restore guarantee is claimed.
