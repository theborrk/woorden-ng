---
id: T-143
title: Inspect calendar eligibility and review-window suggestions
status: done
size: M
depends_on: [T-003]
type: task
refs: [W11, T19, T20, T21, I10, F03]
---

## Goal

A contributor can inspect a next eligible instant and suggested review window for an arbitrary scheduler interval without waiting for real time.

## Context

- Blueprint §§12.1–12.3, 22.2 and 25; `docs/architecture/spikes/time.md`.
- Reuse the injected Temporal adapter and resolved-boundary fixtures from T-003.

## Scope

In:

- Direct Node inspector for integer calendar-day and exact intraday eligibility, six-hour minimum gap and optional windows crossing midnight.
- Versioned max-of-gates result with raw due, target study date, profile timezone and reasons kept separate.
- Temporal compatible resolution for DST gaps/overlaps; deterministic handling of a skipped local date by resolving its boundary then advancing to the first nonempty study day.

Out (do not do in this task):

- Exposure/evidence aggregation (T-146), preferences persistence, clocks, reminders or another Temporal dependency.

## Acceptance criteria

- [x] AC1: Given Amsterdam 06:00 and a one-day result graded at 01:00 on 2 October 2026, when projected, then the target date is 2 October and eligibility is 07:00 local while a 10:30 window remains a suggestion (unit and integration).
- [x] AC2: Given grading at 23:50 or just before/after 06:00, when projected, then dates are correct and the six-hour gap prevents a near-zero day review without altering raw due (unit).
- [x] AC3: Given March/October DST, leap day, a window crossing midnight or a zone skipping a date, when inspected, then literal expected zoned instants follow compatible resolution and calendar addition rather than 24-hour day arithmetic (unit and integration).
- [x] AC4: Given a sub-day result even in Review or sibling/postponement gates, when projected, then exact engine due is retained and eligibility is the maximum applicable gate, with window attendance optional (unit).

## Notes for the implementer

Native work: no. Primary files: `src/domain/time-policy/`, `tools/learning/inspect-eligibility.ts`, `tests/fixtures/learning/eligibility/`.
Keep package manifests and shared barrel files untouched. Accept plain injected values and never read a live clock/device zone. Reuse T-003 boundary functions; serialize diagnostics as primitives. The skipped-date convention is versioned and must not mutate historical dates.

## Notes for the reviewer

Require independent expected instants and half-open day boundaries. This headless policy slice is executable before repositories exist.

## Implementation evidence

- AC1: `T19: AC1` unit/CLI integration tests assert 2 October target, 07:00 local eligibility
  and optional 10:30 window from literal fixture values.
- AC2: `T20: AC2` unit cases assert 23:50, just before and exactly at 06:00, with unchanged
  raw due and a configurable elapsed safeguard.
- AC3: `T21: AC3` fixtures and CLI tests cover March/October compatible boundary/window
  resolution, 23/25-hour days, leap day, three calendar days, midnight window tails/ends and
  Apia's skipped date. Calendar/gap expectations were independently checked with Python zoneinfo.
- AC4: `I10: AC4` tests retain exact/subsecond intraday due even in Review, inspect every gate
  and maximum/tied controlling reasons, and keep attendance separate from eligibility.
- `tests/fixtures/learning/eligibility/README.md` documents the versioned input, skipped-date
  convention and exact direct-Node command. T-003's import extension was made Node-resolvable;
  its existing boundary behavior remains intact. No package manifest/barrel/native edits.
