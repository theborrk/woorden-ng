---
id: T-127
title: Persist native profiles and recover failed database initialization
status: done
size: M
depends_on: [T-126, T-005]
type: task
refs: [W06, W47, T63, T72, I20, I22, F14]
---

## Goal

An Android learner can use the local profile Settings flow with durable native SQLite, or reach a
recovery screen that preserves the database when it cannot open safely.

## Context

- Blueprint §§8, 17.1, 17.4, 18.4; ADR 0006 and storage-android spike findings.
- T-126 supplies shared commands/UI; T-005's disposable startup schema is not authoritative storage.

## Scope

In:

- Authoritative app-private native DB with independent schema version, parameterized SQL, foreign
  keys, serialized connection ownership and bounded busy handling. Reuse the proven bridge semantics.
- Native profile/preferences adapter selected only by `src/targets/android.ts`.
- Atomic DDL/data/version migrations, missing-plugin/newer-schema/open/migration recovery states,
  retry and preservation of original data; read-only logical export when the version is supported.
- Same profile switching and separate-installation explanation as web.

Out (do not do in this task):

- Native files/picker (T-135/T-139), attempt writes (T-130), lifecycle plugin or signing changes.
- Destructive reset/downgrade, silent IndexedDB/Preferences/in-memory fallback or old-app migration.

## Acceptance criteria

- [x] AC1: Given two native profiles, when preferences are edited, switched and the process restarts,
      then each retains its own data through real SQLite and no cross-profile state leaks (device test).
- [x] AC2: Given missing native support or open/newer-schema failure, when launch is attempted,
      then the recovery screen offers safe retry/export as supported and never substitutes web storage (unit and device test).
- [x] AC3: Given an older populated DB, when migration fails after a write or the process dies
      during migration, then restart finds the old or fully migrated schema/data, never a partial version (device test).
- [x] AC4: Given separate PWA/native installations, when profile Settings are opened, then their
      installation IDs/stores are distinct and neither claims automatic transfer (e2e and device test).

## Notes for the implementer

Native work: yes. Primary files: `src/infrastructure/db/android/`, `src/platform/android/storage/`,
`src/targets/android.ts`, `src/features/settings/storage-recovery/`, `e2e-android/profiles.spec.ts`.
Use SQL NULL for optional indexes, explicit values arrays, query for result-bearing PRAGMAs and
disabled per-statement auto-transactions inside a unit of work. Keep version diagnostics local.
Device tests run in CI only; no new plugin is needed beyond the pinned SQLite plugin.

## Notes for the reviewer

T63/I20 requires preserved data and visible recovery, not a passing plugin mock. Do not copy a live
SQLite file as an export; unknown versions must be explained without claiming a valid v2 backup.
