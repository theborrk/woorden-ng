---
id: T-225
title: Activate PWA updates after a durable safe checkpoint
status: todo
size: M
depends_on: [T-224, T-162]
type: task
refs: [W33, T42, F11]
---

## Goal

A PWA learner can accept an update without a surprise reload or lost answer/import.

## Context

- Blueprint §18.2; build on T-162 durable interruptions and existing src/sw.ts prompted registration.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Replace the bootstrap reload action with draft/transaction/import guards, durable checkpoint confirmation and a pending update prompt. Coordinate tab update intent, activate once at a safe boundary and retain old assets while clients need them; support retry when activation/checkpoint fails.

Out (do not do in this task):

- DB migration coordination, Android update mechanisms or forced reload loops.

## Acceptance criteria

- [ ] AC1: Given an update during an answer or import, when the learner requests activation, then no reload occurs until the draft/checkpoint and transaction/import boundary are safe (integration and e2e).
- [ ] AC2: Given a completed checkpoint and two active clients, when the update is accepted, then each client transitions safely once and the resumed draft keeps assistance without duplicate grading (e2e).
- [ ] AC3: Given a failed checkpoint or interrupted activation, when the learner retries, then the prior build stays usable with a visible recovery action and no reload loop (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/sw.ts`, `src/platform/web/updates/`, `e2e/safe-web-update.spec.ts`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
