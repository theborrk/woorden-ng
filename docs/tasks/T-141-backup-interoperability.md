---
id: T-141
title: Prove PWA Android PWA backup interoperability
status: todo
size: M
depends_on: [T-140]
type: task
refs: [W09, W50, T35, T36, T64, T66, T71, T72, I08, I19, I22, F10, F14]
---

## Goal

A maintainer can prove a real PWA backup restores on native SQLite and exports back to the PWA
with equal history/schedules/media, while each destination keeps its own installation identity.

## Context

- Blueprint §§17.2, 22.4a and 23.1; ADR 0002's `test:backup-interop` gate.
- T-134–T-140 implement the actual services/adapters; this completes W50's M2 integrity portion.

## Scope

In:

- Deterministic synthetic profiles with EN/PL/RU, equal-time events, parameter versions, retained
  content revisions, personal media, optional omissions and all three compatible import modes.
- `test:backup-interop` local shared-format/web checks; a CI device test imports an archive produced
  by the real web export service into real native SQLite/files, exports it back and restores via Dexie.
- Assert logical equality independently of ZIP metadata, fresh destination identity and historical
  device preservation; platform permissions/notification IDs excluded and no implied future sync.
- Shared hostile/canceled/interrupted transfer regression fixtures and a short portability runbook.

Out (do not do in this task):

- New product behavior/plugins, native release/update/ABI gates or claimed physical-device execution.
- A JS SQLite mock, DB-file copy or a test that only cycles the same adapter twice.

## Acceptance criteria

- [ ] AC1: Given a web-produced full backup, when restored on the CI Android app and exported back
      into a fresh PWA store, then exact IDs/events/schedules/content references/personal hashes match (integration and device test).
- [ ] AC2: Given separate destination installations and profile switches, when local commands follow
      transfer, then fresh destination IDs/sequences are used, historical IDs remain and progress stays isolated (integration and device test).
- [ ] AC3: Given portable settings, omitted optional media and corrupt/canceled/interrupted input,
      when both sides run regression cases, then platform fields never transfer and failures preserve usable prior data (integration and device test).
- [ ] AC4: Given npm run test:backup-interop and the existing CI device commands, when executed,
      then they run the format/web and real native legs respectively and report their distinct evidence (integration and device test).

## Notes for the implementer

Native work: yes. Primary files: `tests/integration/backup/`, `e2e-android/backup-interop.spec.ts`,
`tools/testing/backup-interop/`, `package.json`, `docs/backup/portability.md`.
Use the current device runner and script discovery; do not edit protected CI workflows. The native
leg executes only in CI. Fixed fixture content must stay synthetic and offline. Retain both archives
as test artifacts where useful; never use personal learner data.

## Notes for the reviewer

Require proof of both authoritative stores and native persistent files. Local web/format success
does not constitute the cross-target gate. W50's later signed-update/real-device checks remain planned.
