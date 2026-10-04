---
id: T-220
title: Inspect verified offline capabilities separately
status: todo
size: M
depends_on: [T-123]
type: task
refs: [W32, F11, T41]
---

## Goal

A contributor can inspect which app, selected content and audio capabilities are verified locally, without mistaking a manifest for a completed download.

## Context

- Blueprint §§18.1, 21; reuse validated runtime/pack contracts from T-123.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Add an EN/PL capability inspection view with explicit verified, missing, corrupt and unknown observations; show hashes, sizes and reasons. Read actual browser cache presence for app assets; inspect supplied content/media observations without downloading or claiming sample fixtures describe the learner installation.

Out (do not do in this task):

- Pack installation, native adapters, production Today wiring and changing package manifests; package manifests stay untouched.

## Acceptance criteria

- [ ] AC1: Given a cached app shell and selected content with missing audio, when the inspection opens, then app/content/audio have separate statuses and no combined ready badge is shown (unit and e2e).
- [ ] AC2: Given a missing, corrupt or merely declared asset, when its observation is inspected, then it remains unavailable or unknown with its hash and reason, including after offline reload (integration and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/inspection/offline/`, `e2e/offline-inspection.spec.ts`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
