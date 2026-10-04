---
id: T-152
title: Resolve duplicate and conflicting study submissions across tabs
status: todo
size: M
depends_on: [T-151, T-133]
type: task
refs: [W13, T16, T39, I01, I13]
---

## Goal

A PWA learner can see when another tab saved the attempt, keep an unsent answer as practice context and continue from current state.

## Context

- Blueprint §8 and T16/T39; T-133 owns storage/versionchange coordination.
- T-150/T-151 provide actual attempt commits and recovery.

## Scope

In:

- Shared learning conflict result and web stale-study notification/resolution flow.
- Same-attempt duplicates resolve to the saved result; independent stale drafts remain inspectable practice instead of being blindly retried against a new revision.
- Refresh current eligibility and preserve first-response/help context with or without tab messaging.

Out (do not do in this task):

- New locking/repository machinery, backup merge/sync or native plugins.

## Acceptance criteria

- [ ] AC1: Given the same attempt open in two tabs, when both submit, then one event/transition is durable and both show the same saved result (integration and e2e).
- [ ] AC2: Given different drafts against one base revision, when one commits first, then the stale tab retains its answer/help as practice context, reports the conflict and cannot grade it against a refreshed prompt automatically (e2e).
- [ ] AC3: Given tab messaging unavailable or delayed, when submissions race, then transactional revision/parent/hash checks still reject the stale branch and no duplicate grade occurs (integration and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/study/conflicts/`, `src/platform/web/study-coordination/`, `e2e/study-concurrency.spec.ts`.
Starter study: yes. Exercise two real pages sharing the same Dexie database. Existing T-133 owns generic DB upgrade UX; this task supplies a small actual study-conflict screen using the command slice, not the complete W15 study UI.

## Notes for the reviewer

Locks and BroadcastChannel are optional UX support. Correctness must remain in existing transactions.
