---
id: T-244
title: Document learner controls and recoverable data ownership
status: todo
size: M
depends_on: [T-231, T-232, T-235]
type: task
refs: [W39, F11, F12, F13]
---

## Goal

A learner can follow EN/PL instructions to study, transfer a backup and recover without silently deleting history.

## Context

- Blueprint §§16, 23.5; document actual UI/commands and native/web storage separation.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Write user guide for supports/help/self-report, independent cue locale, budgets/practice and offline download states. Include backup/restore/profile transfer, browser eviction, native uninstall/clear-data, missing voices, bad-pack repair and deliberate deletion; validate guided paths with synthetic data and link remaining capability limitations.

Out (do not do in this task):

- New UI features, old-app progress imports and claims automatic Play/device/cloud restoration.

## Acceptance criteria

- [ ] AC1: Given a synthetic profile and the documented EN/PL flow, when the guide steps are followed, then backup/restore and offline controls match labels and preserve expected IDs/media hashes (e2e).
- [ ] AC2: Given separate PWA/native installs or unavailable voice/storage, when the guide is validated, then transfer is explicit and data-loss/backup/retry limitations match implemented behavior with no implied sync (integration).

## Notes for the implementer

Native work: no. Primary files: `docs/user-guide/`, `e2e/guide-recovery.spec.ts`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
