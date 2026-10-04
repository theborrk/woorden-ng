---
id: T-145
title: Replay versioned schedules and retain parameter rollback
status: todo
size: M
depends_on: [T-142]
type: task
refs: [W10, T18, F03]
---

## Goal

A contributor can replay retained transitions with their recorded policy/parameter versions and inspect an unsupported-version blocker or a reversible future-only parameter change.

## Context

- Blueprint §§11.1, 11.4 and T18; FSRS spike serialization/version findings.
- Build on T-142 and T-123 runtime records rather than adding another persisted schema.

## Scope

In:

- Deterministic replay inspector using recorded evaluation instants, resolved parameter sets, package/engine and cap-policy versions.
- Immutable parameter-set identities; future-only activation and rollback preview without rewriting history.
- Version compatibility dispatch, canonical before/after checks and explicit unsupported replay reports preserving input.

Out (do not do in this task):

- Optimizer/history-fitting workflow (later W32), new library versions, repository writes or silently recomputing existing due dates.

## Acceptance criteria

- [ ] AC1: Given a pinned multi-review/lapse/relearning history, when replayed, then native/effective cards and logs match recorded transitions exactly through JSON round-trip (unit and integration).
- [ ] AC2: Given a future-only parameter change then rollback, when new transitions are inspected, then each uses its recorded parameter/policy identity and previous results stay byte-for-byte interpretable (unit).
- [ ] AC3: Given an unsupported engine/schema/policy version or mismatched base, when replay is requested, then a compatibility error preserves the original input and no replacement schedule is emitted as valid (unit and integration).

## Notes for the implementer

Native work: no. Primary files: `src/infrastructure/fsrs/replay/`, `tools/learning/replay-schedule.ts`, `tests/fixtures/learning/replay/`.
Reuse adapter functions, never implement a second FSRS algorithm. The command is a real replay/rollback preview slice; durable correction is T-153. Do not edit existing schema or backup tasks to resolve compatibility.

## Notes for the reviewer

T18 requires recorded version interpretation and rollback behavior, not merely a version string on a fixture.
