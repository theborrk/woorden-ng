---
id: T-233
title: Measure local study responsiveness at growth scale
status: todo
size: M
depends_on: [T-161, T-117]
type: task
refs: [W34, W36, F13]
---

## Goal

A maintainer can reproduce study timings with 10,000 entries and 100,000 events and identify measured bottlenecks.

## Context

- Blueprint §22.5; T-117 catalog coverage and T-161 ordinary study, synthetic growth data only.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Create deterministic valid growth fixtures and a production-browser benchmark with warm next-card p95, cold-shell interactive time and main-thread grading stalls. Record device/browser/build/sample count and compare initial 150ms p95/2s shell targets; fix only demonstrated study query/render bottlenecks in this slice.

Out (do not do in this task):

- Import performance, fabricated physical-device timings, arbitrary threshold weakening or Android implementation.

## Acceptance criteria

- [ ] AC1: Given 10,000 entries and 100,000 valid events, when the benchmark runs, then counts/logical outcomes remain exact and raw timing samples plus p95/cold-start measurements are reproducible (integration and e2e).
- [ ] AC2: Given a deliberately slow control and ordinary local study, when the timing reporter runs, then it detects the regression, reports target failures honestly and preserves grading/hash equivalence (integration and e2e).

## Notes for the implementer

Native work: no. Primary files: `tools/testing/growth-study/`, `src/application/queries/growth/`, `e2e/growth-study.spec.ts`, `docs/performance/study.md`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
