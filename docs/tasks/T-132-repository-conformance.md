---
id: T-132
title: Run one conformance suite against both authoritative repositories
status: todo
size: S
depends_on: [T-130]
type: task
refs: [W06, W50, T61, T62, T63, I02, I19, I20]
---

## Goal

A maintainer can run one logical command fixture suite through Dexie and the installed Android
SQLite bridge and compare durable results instead of relying on separate spike implementations.

## Context

- Blueprint §§17.1, 22.4a, 23.1 and W50's M2 portion; ADR 0002 script gates.
- T-129/T-130 already implement the production command slice; T-004/T-005 are isolated spikes.

## Scope

In:

- Promote reusable fixture expectations into one platform-independent conformance suite/driver port.
- Cover profile isolation, compound keys, NULL/absent commit keys, canonical hashes/order, atomic
  writes, duplicates/revisions, projection rebuild and successful/failed schema migrations.
- Run existing `test:repositories:web` and `test:repositories:android` scripts against production
  adapters, retaining spike regressions. Record exact logical equality and native recovery results.

Out (do not do in this task):

- New persistence behavior, plugin/permission changes, release/ABI matrix or physical-device claims.
- JavaScript SQLite substitutes or treating web test success as native proof.

## Acceptance criteria

- [ ] AC1: Given identical command fixtures, when both production drivers run, then exact logical
      events/states/hashes/order agree and a deliberate driver mismatch fails the suite (integration and device test).
- [ ] AC2: Given write/migration failures and duplicate attempts, when the shared cases run, then
      each repository preserves prior state and recovery never silently selects another store (integration and device test).
- [ ] AC3: Given the existing npm repository commands, when executed locally/on CI respectively,
      then they include the production suite and retain the original spike regression cases (integration and device test).

## Notes for the implementer

Native work: yes. Primary files: `tests/integration/repositories/`, `e2e-android/repositories/`,
`package.json`. This task owns shared test plumbing only; production fixes found outside Scope are
reported in the PR. Native fixtures run inside the installed APK using the real pinned bridge.

## Notes for the reviewer

One expectation source must exercise both production adapters. Scheduling payload equivalence
here concerns prepared transitions; end-to-end grading belongs to the M3 tasks.
