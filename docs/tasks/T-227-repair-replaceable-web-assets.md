---
id: T-227
title: Repair stale PWA assets while preserving learning data
status: todo
size: M
depends_on: [T-226]
type: task
refs: [W33, W34, T42, F11]
---

## Goal

A PWA learner can recover a stale chunk or unavailable cache without resetting personal data.

## Context

- Blueprint §§18.2, 23.5; reuse T-133 storage recovery and T-226 compatibility handling.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Handle stale chunk URLs and restrictive cache modes with a bounded repair/retry flow. Refresh only replaceable app assets, preserve database/personal media and old release metadata; expose recovery/export if compatibility cannot be restored.

Out (do not do in this task):

- Deleting learning data, unlimited reload retries, native repair and binary/schema downgrade.

## Acceptance criteria

- [ ] AC1: Given a stale chunk URL or unavailable Cache Storage, when the built app opens, then a usable recovery screen appears with no repeated automatic reload (e2e).
- [ ] AC2: Given saved history, a hinted draft and personal media, when replaceable assets are repaired, then their IDs/hashes/help survive and compatible study resumes (integration and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/app/asset-recovery/`, `src/platform/web/asset-repair/`, `e2e/pwa-asset-repair.spec.ts`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
