---
id: T-133
title: Recover web write failures and coordinate database upgrades
status: todo
size: M
depends_on: [T-129]
type: task
refs: [W06, T37, I12, I18]
---

## Goal

A PWA learner sees an actionable unsaved/recovery state after storage failure or a blocked upgrade,
and can retry or export recoverable data while prior durable history remains intact.

## Context

- Blueprint §§8, 17.1, 17.4; storage-web spike explicitly did not prove quota or multiple-tab UX.
- T-129 provides atomic writes/conflicts; full study concurrency UI remains W13.

## Scope

In:

- Shared save-state presentation applied to profile edits and persisted draft checkpoints.
- Web quota/open/failed-migration/newer-schema handling, local diagnostics and a labelled recovery
  JSON export of supported readable state/unsaved draft; never mislabel it a portable v2 backup.
- Blocked/versionchange coordination and stale view refresh across two tabs; revision/hash checks
  stay authoritative even without BroadcastChannel/coordination locks.

Out (do not do in this task):

- Native recovery (T-127), ZIP backups (T-134), automatic deletion/reset or in-memory durability fallback.
- Full storage management/performance dashboard, PWA service-worker update policy or attempt UI.

## Acceptance criteria

- [ ] AC1: Given an injected quota/write rejection during a draft/preferences save, when it fails,
      then the UI says unsaved, retains the edit and offers retry/recovery export without changing durable data (integration and e2e).
- [ ] AC2: Given another tab holding an old DB connection, when an upgrade starts, then a clear
      close/retry path completes it without deleting history or losing either tab's draft (e2e).
- [ ] AC3: Given two tabs submitting stale profile edits, when one commits, then the other refreshes
      its base state and retains its unsaved edit without an automatic overwrite (e2e).
- [ ] AC4: Given migration failure or a newer unsupported DB, when opening, then prior bytes remain
      intact and a compatible read-only export is offered only when it can be validated (integration and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/platform/web/storage/`, `src/features/settings/storage-recovery/`,
`src/infrastructure/db/web/`, `e2e/storage.spec.ts`. Simulate browser failure at the adapter boundary,
not by weakening transaction assertions. Do not delete the DB to unblock tests.

## Notes for the reviewer

T37 needs a demonstrable retained draft and honest success status. Tab locks improve UX but never
replace transactional revision checks. Export limitations must be explicit.
