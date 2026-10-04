---
id: T-123
title: Inspect validated runtime and learning records
status: done
size: M
depends_on: []
type: task
refs: [W05, I12, I14]
---

## Goal

A contributor can validate a versioned profile, task, session or event file and inspect its canonical
representation before it reaches a repository.

## Context

- Blueprint §§7–8, 17.1 and W05; ADR 0003.
- T-110 owns content entry validation and the content registry. Reference its opaque content IDs;
  do not implement a second entry schema or issue competing content IDs.
- T-002/T-003 establish scheduler serialization and injected time prerequisites.

## Scope

In:

- Pure boundary schemas for profiles/preferences, task definitions, enrollments, sessions/drafts,
  task progress, scheduler envelopes, parameter sets and immutable study-event variants in §7.
- Independent version fields, explicit timestamps, locale/cue identity, revisions, parent transition
  IDs, commit keys and canonical JSON/hash rules. Inject ID/time allocation; no positional IDs.
- A file inspector that validates representative records, prints canonical output and reports field
  errors with a failing exit code. Retain enough versioned prompt context to interpret old events.

Out (do not do in this task):

- Content entry validation (T-110), backup manifests (T-124), repositories, grading or FSRS policy.
- Legacy calibration/snapshots, provider SDKs, runtime services or new shared dependencies.

## Acceptance criteria

- [x] AC1: Given valid versioned profile/task/session/event fixtures, when the inspector runs, then
      it prints stable IDs and canonical bytes/hashes across key order and EN/PL/RU text (unit and integration).
- [x] AC2: Given an unknown version, unsafe timestamp, invalid enum or missing event context, when
      validated, then it reports the offending field and exits unsuccessfully (unit and integration).
- [x] AC3: Given PL-cued history and EN interface preferences, when preferences round-trip through
      validation, then cue locale, historical prompt context and scheduler/eligibility fields remain distinct (unit).
- [x] AC4: Given assistance/exposure events sharing an attempt ID, when validated, then only a final
      committed attempt has a commit key and external claims cannot masquerade as study events (unit).

## Notes for the implementer

Native work: no. Primary files: `src/contracts/runtime/`, `tools/contracts/inspect-runtime.ts`,
`tests/fixtures/runtime/`. Run the inspector directly with Node; keep package manifests and shared
barrel files untouched so T-124 and T-125 can start alongside this task. Schema validation must be
real validation of unknown input, not TypeScript assertions. Native card validation follows the
pinned serialization; scheduler behavior and upgrades remain W10. Prefix invariant tests with IDs.

## Notes for the reviewer

The inspector is the complete contributor-facing slice. Check hostile input rejection and event
context retention without implementing the later learning flow.
