---
id: T-004
title: Prove Dexie transactions, unique keys and upgrades in a first web repository suite
status: done
size: M
depends_on: []
type: task
refs: [W02, F10]
---

## Goal

The project knows how the pinned Dexie version behaves for the blueprint's storage rules (atomic
multi-store commits, rollback, optional unique keys, compound keys, versioned upgrades), and CI runs
a `test:repositories:web` suite from now on.

## Context

- Blueprint: section 5 (A03, A04), section 8 (transaction boundary, `LearningUnitOfWork`), section
  17.1 (stores, optional `commitKey`, key types, round-trips), section 17.4, W02 in section 24
- CI: the verify job runs `test:repositories:web` as soon as `package.json` defines it (ADR 0002)

## Scope

In:

- Add `dexie` at an exact version and `fake-indexeddb` as a dev dependency.
- A small spike schema in `src/infrastructure/db/web/`: `events` (unique ID, unique optional
  `commitKey`), `taskProgress` (compound key, indexed eligibility timestamp) and `projectionMeta`.
  It is a spike, not the final schema.
- Contract-style tests in `tests/integration/repositories/`, written so the same cases can later run
  against the native adapter (T-005, W06).
- npm script `test:repositories:web`.
- `docs/architecture/spikes/storage-web.md`: version, findings, and what W06 must handle.

Out (do not do in this task):

- The final schema, repositories and unit of work (W06); multi-tab coordination (W13).

## Acceptance criteria

- [x] AC1: Given a transaction that writes an event, a progress row and a projection watermark, when
      it completes, then all three are stored; when it throws after the writes, then none are
      (integration)
- [x] AC2: Given attempt events with a `commitKey` and other events without the property, then any
      number of events without it coexist, and a second event with an existing `commitKey` is
      rejected (integration)
- [x] AC3: Given a compound-key progress row, when it is written twice, then one row with the latest
      revision exists; queries by the eligibility index return a stable order (integration)
- [x] AC4: Given a version 1 database with data, when it opens as version 2 with an upgrade function,
      then the data is migrated; when the upgrade throws, then the version 1 data is intact
      (integration)
- [x] AC5: Millisecond instants and canonical JSON values round-trip unchanged (integration)
- [x] AC6: `npm run test:repositories:web` runs the suite, and the spike document records the
      findings (review)

## Notes for the implementer

Booleans and optional objects are not valid IndexedDB keys (section 17.1): the schema must not index
them. Keep the test cases as data plus expectations, so the native suite can reuse them.

## Notes for the reviewer

AC2 is the subtle one: an empty string or `null` instead of an absent property would create false
uniqueness conflicts.
