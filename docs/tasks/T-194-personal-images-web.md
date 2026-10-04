---
id: T-194
title: Attach durable private photos to memory supports
status: todo
size: M
depends_on: [T-193, T-134]
type: task
refs: [W26, F05, T57]
---

## Goal

A learner can attach, replace and remove a private image and export it safely.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Gesture file picker, MIME/size checks, durable browser blob storage by hash, language-neutral identity and user descriptions. Atomic reference change, explicit replacement/delete policy and inclusion in full backups; no upload.

Out (do not do in this task):

- Native plugin/permission changes, cloud services, runtime pack updates or unrelated study UI.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given a chosen private photo, when saved and reopened offline, then the correct hash resolves and export includes its bytes (integration and e2e).
- [ ] AC2: Given cancellation, corrupt media or quota failure, when replacing, then the prior image remains usable and no saved claim appears (e2e).
- [ ] AC3: Given a screen-reader description or deletion, when displayed, then the description is available outside hidden-target trials and unrelated history remains intact (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/platform/web/personal-images/`, `tests/integration/m7-m8/t-194/`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
