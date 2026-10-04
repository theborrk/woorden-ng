---
id: T-226
title: Coordinate old tabs before web schema upgrades
status: todo
size: M
depends_on: [T-225]
type: task
refs: [W33, T39, F11]
---

## Goal

A PWA learner can close an old tab blocking a schema upgrade and resume without deleting data.

## Context

- Blueprint §§17.4, 18.2; reuse authoritative Dexie repository and T-225 safe updates.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Expose versionchange/blocked coordination with clear close/retry/export actions and compatible-client checks. Test successful migration, rollback on injected failure and newer unsupported DB recovery; do not open normal study with an incompatible schema.

Out (do not do in this task):

- Native migrations, destructive downgrade and storage reset workarounds.

## Acceptance criteria

- [ ] AC1: Given an old tab holding the DB open, when the new version attempts upgrade, then the blocked state identifies close/retry actions and no tab deletes or falsely saves data (integration and e2e).
- [ ] AC2: Given a migration failure or newer unsupported DB, when startup runs, then prior data is preserved with a recovery/export state and successful retry migrates once (integration and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/infrastructure/db/web/upgrade-coordination/`, `e2e/web-schema-upgrade.spec.ts`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
