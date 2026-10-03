---
id: T-002
title: Pin ts-fsrs and record its actual scheduling behavior in fixtures
status: done
size: S
depends_on: []
type: task
refs: [W02, F03]
---

## Goal

The project knows from executable fixtures, not memory, how the pinned `ts-fsrs` version schedules
cards with the blueprint's starting configuration, so the scheduler adapter (W10) is built on
verified semantics.

## Context

- Blueprint: section 5 (A05, A06), section 11 (11.1 adapter responsibilities and the starting
  configuration), section 25, W02 and W10 in section 24, T02 and T18 in section 22.1

## Scope

In:

- Add `ts-fsrs` at an exact version.
- Fixture tests under `src/infrastructure/fsrs/` (or `tests/integration/fsrs/`) using section 11.1's
  configuration (`request_retention` 0.9, `maximum_interval` 365, short-term on, fuzz off, learning
  and relearning steps `1m`, `10m`) and fixed instants.
- `docs/architecture/spikes/fsrs.md`: version, the API used, state fields, step and interval
  semantics (including the unit of `maximum_interval` and of scheduled days), preview versus
  commit, serialization, and open questions for W10.

Out (do not do in this task):

- The adapter, its persistence and replay (W10).

## Acceptance criteria

- [x] AC1: Given a new card at a fixed instant, when it is rated Again, Hard, Good and Easy, then
      the resulting state, step, due instant, stability and difficulty match committed fixture
      values (unit)
- [x] AC2: Given a card moving through the learning steps (for example Good, then Good after the
      step delay), then the fixture shows when it graduates to Review and with which interval; the
      same for Relearning after a lapse (unit)
- [x] AC3: Given fuzz disabled, when identical inputs are scheduled twice, then the results are
      identical (unit)
- [x] AC4: Given a card after several reviews, when it is serialized to JSON and back, then the next
      scheduling result is identical (unit)
- [x] AC5: Given the same card state and evaluation instant, when the preview API and the rating API
      are called, then they agree (unit)
- [x] AC6: `docs/architecture/spikes/fsrs.md` records the version, findings and open questions
      (review)

## Notes for the implementer

Use fixed `Date` values everywhere; never the real clock. Keep fixtures readable (ISO instants).

## Notes for the reviewer

The value of this task is that the fixtures describe what the library really does. Check that they
are generated from the library, not hand-written expectations that happen to pass.
