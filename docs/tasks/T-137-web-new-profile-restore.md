---
id: T-137
title: Restore a validated backup as a new local web profile
status: todo
size: M
depends_on: [T-136]
type: task
refs: [W09, T35, T37, I12, I18, I22, F10]
---

## Goal

A PWA learner can explicitly restore a new-app backup as a new local profile while the previous
installation data remains usable until the restored profile has opened successfully.

## Context

- Blueprint §17.2 staging/activation and §17.4 recovery; T-136 validates archives without live mutation.
- A restore namespace is distinct from portable logical profile/content IDs; history IDs are preserved.

## Scope

In:

- Shared restore journal/state machine and web namespace-scoped repositories/unique indexes.
- Stage rows and durable personal media, verify references/files, atomically switch the profile/
  namespace pointer in Dexie, then confirm successful open/exportability before retiring prior state.
- Settings new-profile restore confirmation/progress/retry/cancel and startup journal recovery.
- Preserve historical device IDs but use a fresh destination installation ID/sequence for future
  events; resume existing destination identity for repeated restores within that installation.

Out (do not do in this task):

- Replace/merge modes (T-138), native activation, cross-device sync or copying platform permissions.
- Deleting the previous namespace before validation/open or rewriting immutable history IDs.

## Acceptance criteria

- [ ] AC1: Given a validated backup with personal media, when restored as a new profile, then IDs,
      history, schedules and verified media match the source and the prior profile remains usable (integration and e2e).
- [ ] AC2: Given existing profile/event/commit-key IDs matching the import, when staging, then
      namespaces coexist without uniqueness failures or history reassignment (integration).
- [ ] AC3: Given quota failure, cancellation or termination before/after pointer activation, when
      restarted, then one complete usable namespace is active and journal recovery can retry safely (integration and e2e).
- [ ] AC4: Given foreign device IDs/sequence and platform settings, when restored and a new local
      command is committed, then historical IDs persist but new events use destination identity without copied permissions (integration).

## Notes for the implementer

Native work: no. Primary files: `src/application/backup/restore/`, `src/infrastructure/db/web/restore/`,
`src/platform/web/media/`, `src/features/settings/backup/restore/`, `e2e/backup.spec.ts`.
Files are verified before DB activation; DB activation contains no filesystem/network work. Restore
does not mint new portable IDs for source history. In a fresh destination, allocate a fresh installation
ID; restoring again must not reset its live event sequence or collide with previous local events.

## Notes for the reviewer

Inspect both sides of the activation boundary and prior-state retention. A staged copy is not a
successful restore; no profile becomes active with missing required personal files.
