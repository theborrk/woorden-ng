---
id: T-130
title: Commit prepared learning records atomically on native SQLite
status: todo
size: M
depends_on: [T-129, T-127]
type: task
refs: [W06, W47, W50, T61, T62, T37, I02, I18, I19, I20, F14]
---

## Goal

The same prepared command/query slice works on Android's authoritative database and survives
exceptions or process death without a partial write or duplicate scheduling application.

## Context

- Blueprint §§8, 17.1/17.4; ADR 0006 and native bridge spike findings.
- T-129 owns the shared command/projection semantics; T-127 owns native connection/open recovery.

## Scope

In:

- Native implementations of T-129 repositories and queries, schema migrations and constraints.
- One serialized connection/real transaction for event/progress/counter/outbox/meta writes, with
  rollback, transaction-local revision/base/parent checks and final unique constraints.
- Reuse shared projection functions/fixtures; native process-death recovery and bounded precommit
  busy handling. Propagate failure and preserve durable or in-memory recoverable drafts.

Out (do not do in this task):

- Scheduler/grade computation, native files/lifecycle plugin, sync or fallback WebView storage.
- Copying SQL handles/vendor types into shared contracts or creating a second projection algorithm.

## Acceptance criteria

- [ ] AC1: Given the shared command fixtures, when run through real native SQLite and reopened,
      then logical events, projections, ordering, hashes and scheduler envelopes equal web results (device test).
- [ ] AC2: Given an exception after each affected write, when committing, then every table rolls
      back and retry uses the original draft without a false saved acknowledgement (device test).
- [ ] AC3: Given process termination before/during/after commit, when restarted and retried, then
      either the entire result exists or none does, and at most one attempt is applied (device test).
- [ ] AC4: Given NULL/non-NULL commit keys, stale revisions and wrong base hashes, when submitted,
      then constraints/conflicts match web semantics and preserve unrelated/profile data (device test).

## Notes for the implementer

Native work: yes. Primary files: `src/infrastructure/db/android/`, `src/targets/android.ts`,
`e2e-android/repositories/`. Run through the installed debug APK/bridge in CI, using guarded harnesses
only where necessary. Test controlled death at transaction boundaries, not merely close/reopen after
acknowledgement. Reuse T-005's explicit transaction flags and SQL NULL handling.

## Notes for the reviewer

Native plugin mocks do not prove T61/T62. Inspect process-death evidence and the exact affected rows;
no auto-committed sequence is a valid replacement for the unit of work.
