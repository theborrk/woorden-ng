---
id: T-234
title: Keep growth-scale backup import cancelable and recoverable
status: todo
size: M
depends_on: [T-233, T-138]
type: task
refs: [W34, T35, T36, T37, F11]
---

## Goal

A PWA learner can import a growth-scale backup with visible progress and cancel before activation.

## Context

- Blueprint §§17.2, 22.5; reuse existing bounded archive pipeline and growth fixture.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Exercise large validated backups with progress/cancellation and bounded processing; profile/fix demonstrated import allocation/main-thread stalls. Measure elapsed time/peak bounded buffers and preserve atomic activation, hostile-input limits and exact event/media equality.

Out (do not do in this task):

- New backup format, native file changes or unbounded archive allocation.

## Acceptance criteria

- [ ] AC1: Given a growth archive with 100,000 events and media, when import completes, then visible progress precedes activation and round-trip IDs/hashes match with measured resource bounds (integration and e2e).
- [ ] AC2: Given cancellation, quota failure or oversized hostile archive, when import is interrupted, then old profile stays usable, staging is recoverable and no false completion is displayed (integration and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/application/backup/growth/`, `tools/testing/growth-import/`, `e2e/growth-import.spec.ts`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
