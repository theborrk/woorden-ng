---
id: T-129
title: Commit prepared learning records atomically on web
status: done
size: M
depends_on: [T-126]
type: task
refs: [W06, T37, I02, I18]
---

## Goal

A contributor can execute a validated prepared learning write through the real web repository and
query its durable event, progress and summary together, including duplicate/conflict outcomes.

## Context

- Blueprint §§8, 17.1 and W06; T-004 transaction fixtures and T-123 runtime contracts.
- M3 owns attempt classification, FSRS computation and learning UI; this is their durable command boundary.

## Scope

In:

- Web transaction-scoped repositories for events, task progress/definitions, enrollments,
  sessions/drafts, overrides, parameter sets, local outbox and projection/checkpoint metadata.
- A headless command accepting a prevalidated prepared transition; inside one Dexie transaction
  recheck revision, parent and canonical base hash, append event and update all affected projections/counters/outbox.
- Idempotent same-event retries, integrity conflicts for changed payloads, optional commit keys and
  deterministic profile/eligibility queries. Incremental projections and versioned rebuild from retained events.
- Observable integration driver/query output for saved versus rejected writes; preserve unsaved drafts.

Out (do not do in this task):

- Grading/FSRS policy, a production test-only study screen, sync transport or native adapter changes.
- Full undo/replay learning semantics (W13); this task cannot invent a scheduling result.

## Acceptance criteria

- [x] AC1: Given a prepared event/transition, when committed then reopened, then event, scheduler,
      eligibility, counters, outbox and watermark are all present or all unchanged on injected failure (integration).
- [x] AC2: Given duplicate, stale-revision or same-revision/different-base commands, when submitted,
      then there is at most one accepted transition and conflicting commands leave the draft intact (integration).
- [x] AC3: Given exposure/help rows and equal-time records across profiles, when written/queried,
      then absent commit keys coexist and profile-filtered ordering and canonical bytes are deterministic (integration).
- [x] AC4: Given a stale projection version, when rebuilt from retained ordered events/checkpoints,
      then queries match the incremental result without changing history or scheduling again (integration).

## Notes for the implementer

Native work: no. Primary files: `src/application/persistence/`, `src/infrastructure/db/web/`,
`tests/integration/repositories/`. Only transaction operations may be awaited inside the unit of work;
hash/scheduler/input preparation happens before it. Use T-123 validation, not casts. Keep deterministic
command fixtures reusable by the native driver in T-130/T-132.

## Notes for the reviewer

I02 covers every affected collection, not just event/progress. A failed transaction is not a saved
answer. Demonstrate real Dexie constraints and reopen behavior without weakening spike tests.
