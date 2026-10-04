---
id: T-192
title: Inspect approximate reminder reconciliation
status: todo
size: M
depends_on: [T-123, T-003]
type: task
refs: [W48, F14, T69]
---

## Goal

A contributor can inspect a timezone-aware reminder plan without scheduling an OS alarm.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Pure injected-time reconciliation for default-off opt-in, permission, quiet hours, one selected owner profile, neutral lock-screen text and local-only OS ID mapping. Output cancellations before replacements and test DST/timezone changes.

Out (do not do in this task):

- Native plugin/permission changes, cloud services, runtime pack updates or unrelated study UI.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given denied/disabled reminders or a profile change, when reconciled, then all stale alarms cancel and only one selected profile can own replacements (unit and integration).
- [ ] AC2: Given quiet hours, DST or timezone changes, when planned, then approximate times respect the recorded routine and no exact arrival is promised (unit).
- [ ] AC3: Given restart and exported profile data, when reconciled, then no duplicate alarm or exported OS notification ID appears (integration).

## Notes for the implementer

Native work: no. Primary files: `tools/learning/reminder-inspector/`, `tests/integration/m7-m8/t-192/`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.
Run directly with Node; leave package manifests and shared barrels untouched.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
