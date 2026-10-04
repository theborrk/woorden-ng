---
id: T-142
title: Inspect deterministic FSRS transitions and interval previews
status: done
size: M
depends_on: [T-002, T-123]
type: task
refs: [W10, T02, T60, F03]
---

## Goal

A contributor can run a fixed learning/relearning sequence and inspect the exact proposed native schedule and versioned application interval policy.

## Context

- Blueprint §§11.1–11.2, 22.1 and 25; `docs/architecture/spikes/fsrs.md`.
- Reuse ts-fsrs 5.4.2 and the committed spike fixtures; T-123 owns runtime envelopes and its scheduler/native-card validator.

## Scope

In:

- Adapter createTask/preview/applyRating/serialize/deserialize with vendor types confined to the adapter.
- A direct Node inspector showing native card/log, package/engine/resolved parameters, raw proposal and effective scheduled days.
- Explicit versioned 365-day application cap applied equally to preview and rating; retain the vendor 366/367-day proposals for diagnostics.
- Fuzz off, injected evaluation time and detached input/output values.

Out (do not do in this task):

- Repository/schema reimplementation, eligibility projection, UI, optimization or package upgrades.

## Acceptance criteria

- [x] AC1: Given the pinned New/Learning/Review/Relearning fixtures and fixed instants, when inspected, then all four native ratings match the fixtures and identical preview/rating inputs yield identical results without mutation (unit and integration).
- [x] AC2: Given the native 365/366/367-day maximum-edge proposals, when the versioned cap is applied, then effective intervals never exceed 365 days and preview/rating retain identical native proposals and capped results (unit).
- [x] AC3: Given a serialized valid card or malformed native fields, when deserialized, then the reused T-123 validator accepts an exact date/number round-trip or rejects the snapshot before any scheduler call (unit).
- [x] AC4: Given a preview followed by time/state change, when evaluated at the new captured instant/state, then the inspector recomputes the proposal and cannot apply the stale preview (unit and integration).

## Notes for the implementer

Native work: no. Primary files: `src/infrastructure/fsrs/adapter/`, `tools/learning/inspect-fsrs.ts`, `tests/fixtures/learning/fsrs/`.
Keep package manifests and shared barrel files untouched; run the inspector directly with Node. Reuse T-123 scheduler validation before restoring vendor Date types; do not duplicate its native-card rules. Preserve nativeCard, rawDueAt and scheduledDays exactly as native output; return capped effective intervals separately for eligibility projection, recording the cap version in adapter/eligibility policy identity. Preserve spike fixtures unchanged.

## Notes for the reviewer

Check the cap as a documented app policy rather than changing native expectations. Actual commit-time capture belongs to T-150.
