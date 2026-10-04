---
id: T-201
title: Show per-skill evidence, burden and repair diagnostics
status: todo
size: M
depends_on: [T-191, T-161]
type: task
refs: [W29, F09, T29, T30]
---

## Goal

A learner can inspect delayed evidence and burden with counts and explicit qualifications.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Consume versioned metrics inspector projections, actual gaps and assistance/source labels. Per-skill coverage, de/het balance, observed confusions, repair outcomes, foreground time, abandonment and too-much feedback; recap exposure is applied after metric snapshot.

Out (do not do in this task):

- Native plugin/permission changes, cloud services, runtime pack updates or unrelated study UI.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given mixed task/source/help history, when dashboard opens, then counts/denominators and delay buckets remain separate by tested family (e2e).
- [ ] AC2: Given a missed review or opened recap, when queried, then actual return time and pre-recap evidence remain visible (integration and e2e).
- [ ] AC3: Given sparse observations or forecast, when shown, then uncertainty, missing data and model provenance are explicit without a diagnosis (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/progress/evidence/`, `tests/integration/m7-m8/t-201/`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
