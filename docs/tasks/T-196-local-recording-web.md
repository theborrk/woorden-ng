---
id: T-196
title: Record and replay transient audio locally on web
status: todo
size: M
depends_on: [T-159, T-134]
type: task
refs: [W27, F07, T48, T49, T57, I17]
---

## Goal

A learner can record, listen back and explicitly save a private clip without transcription.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Gesture-only microphone request, capability/status UI, cancel/revoke/pause cleanup, transient clips by default and explicit durable save via personal media/backup port. Recorded input remains locked self-report, no automatic pronunciation scoring.

Out (do not do in this task):

- Native plugin/permission changes, cloud services, runtime pack updates or unrelated study UI.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given no microphone permission, network or optional audio capability, when recording is attempted, then written/self-report study and export continue (unit and e2e).
- [ ] AC2: Given a local recording, when replayed or canceled, then no upload/transcription happens and unsaved bytes are discarded (integration and e2e).
- [ ] AC3: Given explicit save followed by offline reopen/export, when inspected, then private bytes persist by hash while evidence remains labelled self-report (integration and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/platform/web/local-recording/`, `tests/integration/m7-m8/t-196/`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
