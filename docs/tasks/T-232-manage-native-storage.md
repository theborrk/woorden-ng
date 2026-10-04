---
id: T-232
title: Manage native disk health and replaceable downloads
status: todo
size: M
depends_on: [T-230, T-223, T-140]
type: task
refs: [W34, T35, T36, T37, T66, F14]
---

## Goal

An Android learner can free optional pack space while keeping SQLite, personal files and portable backups intact.

## Context

- Blueprint §§18.4, 21; use existing persistent file and backup adapters.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Implement native disk/DB/file diagnostics behind the shared port, explicit replaceable-download cleanup and missing-reference detection. Keep personal file removal/profile deletion separate and confirmed; retain recovery backup before destructive profile replacement/deletion.

Out (do not do in this task):

- Automatic cloud backup, new SQLite plugin, silent reset and binary downgrade.

## Acceptance criteria

- [ ] AC1: Given native progress/draft/personal media and optional packs, when replaceable downloads are removed, then DB and personal hashes survive restart and portable backup round trip is equal (device test).
- [ ] AC2: Given disk write failure or hostile recovery import, when save/import/cleanup runs, then no false saved state or missing-file activation occurs and prior data plus retry/export survives (integration and device test).

## Notes for the implementer

Native work: yes. Primary files: `src/platform/android/storage-management/`, `e2e-android/native-storage-management.spec.ts`.
Native build/emulator execution is CI-only. Owner physical/signing/access evidence stays separate; unavailable prerequisites are precise blockers, never simulated passes.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
