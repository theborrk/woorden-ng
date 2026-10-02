---
id: T-003
title: Choose the Temporal implementation and prove the study-day policy on fixtures
status: todo
size: S
depends_on: []
type: task
refs: [W02, F03]
---

## Goal

The project has a pinned Temporal implementation and executable fixtures for study days across DST
changes and leap days, so the time policy (W11) builds on verified calendar behavior, never on
millisecond arithmetic.

## Context

- Blueprint: A10 in section 5; section 12 (12.1 concepts, 12.2 deterministic policy, 12.3 required
  examples); T19–T22 in section 22.2; section 9.1 (06:00 study-day boundary for this learner)

## Scope

In:

- Native `Temporal` where available, otherwise a maintained polyfill at an exact version. Record
  the choice, its bundle size, and whether Chromium and the Android WebView need it.
- `studyDate(instant, zone, boundary)` and the one-study-day eligibility projection from section
  12.2 as small pure functions under `src/infrastructure/time/`, with fixture tests.
- `docs/architecture/spikes/time.md`: the choice, how clock and time zone are injected, DST
  disambiguation, and open questions for W11.

Out (do not do in this task):

- Eligibility projection beyond the one-day example, exposure gates and scheduler integration (W11).

## Acceptance criteria

- [ ] AC1: Given a 06:00 boundary in Europe/Amsterdam, when a one-study-day review happens at 01:00
      on 2 October 2026, then its study date is 1 October and it becomes eligible at 07:00 on 2
      October (six-hour gap), never on 3 October (section 12.3) (unit)
- [ ] AC2: Given the same settings, when the review happens at 23:50 on 1 October, then it becomes
      eligible at 06:00 on 2 October (section 12.3) (unit)
- [ ] AC3: Given the March and October 2026 DST changes in Europe/Amsterdam, when instants around the
      boundary are mapped, then every instant has exactly one study date and the 23- and 25-hour
      days produce no gaps or duplicates; nonexistent and ambiguous boundary times resolve as
      documented (unit)
- [ ] AC4: Given 28 February to 1 March 2028, then 29 February is a study date of its own (unit)
- [ ] AC5: No code path computes "tomorrow" by adding 86,400,000 ms (unit or lint rule, plus review)

## Notes for the implementer

Inject the time zone and the instant; never read the system clock or zone in these functions.

## Notes for the reviewer

Check the DST fixtures against an independent source (for example the IANA zone rules), not only
against the implementation.
