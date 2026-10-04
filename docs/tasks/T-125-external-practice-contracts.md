---
id: T-125
title: Validate provider-neutral lesson packages and external claims
status: done
size: S
depends_on: []
type: task
refs: [W51, T73, I23]
---

## Goal

A contributor can validate a lesson/hint package and a reported practice observation without an AI
provider, and see why the observation is excluded from app-observed grading.

## Context

- Blueprint §20.2 and T73; §7 stable opaque identities; ADR 0003.
- The companion voice-tutor design is absent; §20.2 completely specifies current W51 scope.

## Scope

In:

- `TutorSessionPackageV1` and `ExternalPracticeObservationV1` schemas, independent of storage/UI.
- Required stable session/profile/sense/task IDs, content revision, time, EN/PL preferences,
  supports/cue/help policy, reporting source, reported outcome and payload hash/version.
- Explicit unknown assistance and pure duplicate classification: same ID/hash is identical, same
  ID/different hash is a conflict. A direct file inspector demonstrates the result.
- Document the future query/export and validated observation-import boundary in
  `docs/contracts/external-practice.md`; it cannot call CommitAttempt or accept supplied FSRS state.

Out (do not do in this task):

- Observation persistence/import UI, network transport, account UI, runtime AI or backend scaffolding.
- Content schema/ID registry work already owned by T-110; scheduling or actual tutor integration.

## Acceptance criteria

- [x] AC1: Given a current lesson fixture with PL/EN explanations and graduated hints, when
      inspected, then all stable IDs, revision, cue policy and support context survive validation (unit and integration).
- [x] AC2: Given an observation with unknown help and repeated IDs, when classified, then unknown
      stays explicit, identical duplicates are idempotent and differing hashes are conflicts (unit).
- [x] AC3: Given an observation carrying attempt_committed or scheduler-state fields, when
      validated, then it is rejected and cannot enter the graded-attempt contract (unit).
- [x] AC4: Given missing IDs, timestamps, versions or reporting source, when the inspector runs,
      then it reports validation failure without requiring any network/provider configuration (integration).

## Notes for the implementer

Native work: no. Primary files: `src/contracts/external-practice/`,
`tools/contracts/inspect-external-practice.ts`, `tests/fixtures/external-practice/`,
`docs/contracts/external-practice.md`. Run directly with Node and leave package manifests/shared
barrels untouched. No dependency on storage or the future learning UI is needed to prove W51.

## Notes for the reviewer

Require T73/I23 test titles. An imported claim is a distinct contract, never a disguised AttemptCommitted.
