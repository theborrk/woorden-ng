---
id: T-191
title: Inspect qualified metrics with reproducible denominators
status: todo
size: M
depends_on: [T-123]
type: task
refs: [W29, F09, T29, T30]
---

## Goal

A contributor can compute honest local evidence and burden summaries from event fixtures.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Pure projection and direct inspector for first/final outcomes, help, self-report versus machine judgment, actual clean gaps and task families. Exclude undone/duplicate/technical/invalid events; foreground time excludes pauses, and late returns use actual occurrence.

Out (do not do in this task):

- Native plugin/permission changes, cloud services, runtime pack updates or unrelated study UI.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given independent, assisted, contaminated and self-reported attempts, when projected, then separate counts/denominators and actual 6–36-hour or 5–9-day ranges are reported (unit and integration).
- [ ] AC2: Given delayed returns or undone/duplicate events, when analyzed, then actual elapsed time is retained and invalid samples are excluded with versioned reasons (unit).
- [ ] AC3: Given sparse data and unobserved real-world exposure, when inspected, then counts and limitations replace precise efficacy claims (integration).

## Notes for the implementer

Native work: no. Primary files: `tools/learning/metric-inspector/`, `tests/integration/m7-m8/t-191/`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.
Run directly with Node; leave package manifests and shared barrels untouched.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
