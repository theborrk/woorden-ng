---
id: T-140
title: Activate verified native restores with restart-safe journals
status: todo
size: M
depends_on: [T-138, T-139]
type: task
refs: [W09, W47, T35, T36, T66, T72, I12, I18, I20, F14]
---

## Goal

Android can restore, replace or compatibly merge a validated portable backup without activating
missing files or losing the preceding profile when a write or process is interrupted.

## Context

- Blueprint §§17.2/17.4, 18.4; T-137/T-138 shared restore/merge policies and T-139 scoped document access.
- T-135 handles durable file staging; SQLite pointer activation must follow successful file verification.

## Scope

In:

- Wire shared validation/preview/modes to native files and namespace-scoped SQLite repositories.
- Durable restore journal, complete-media verification, serialized atomic namespace/profile-pointer
  activation and prior-state retention until successful open/export. Recover abandoned staging on startup.
- Native compatible-history constraints and failure UI, destination identity/sequence rules and
  profile isolation; use shared policy, not a separate Android merge algorithm.

Out (do not do in this task):

- Legacy v1 data, silent partial activation, deleting the sole recovery copy, cloud sync or new plugins.
- Pack install/download policy, signed upgrades or copying permissions/reminder OS IDs.

## Acceptance criteria

- [ ] AC1: Given a full validated backup, when each supported mode succeeds, then IDs/history/
      schedules/media match the shared policy and destination identity/profile isolation remain correct (device test).
- [ ] AC2: Given termination during file write, staged-row write or pointer commit, when restarted,
      then old or fully restored data is usable, incomplete files cannot activate and retry is idempotent (device test).
- [ ] AC3: Given checksum/missing-media/version/conflicting-history failure, when restoring, then
      preview or activation rejects it without changing the preceding profile/files (device test).
- [ ] AC4: Given replacement followed by a failed first open, when recovery runs, then the previous
      verified backup/namespace remains exportable and no false restore-success state appears (device test).

## Notes for the implementer

Native work: yes. Primary files: `src/infrastructure/db/android/restore/`,
`src/platform/android/backup/`, `src/targets/android.ts`, `e2e-android/backup-restore.spec.ts`.
Unique indexes include restore namespace. Never await file/plugin/compression operations inside the
SQLite activation transaction. Device fault cases must cover both sides of commit using the real bridge.

## Notes for the reviewer

T66 is about verified durable bytes before activation, not merely a staged manifest. T72 requires
isolation of active drafts/profile data as well as preferences. Native mocks cannot prove these gates.
