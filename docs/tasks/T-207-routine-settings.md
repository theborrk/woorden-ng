---
id: T-207
title: Configure opt-in routines with a web in-app cue
status: todo
size: M
depends_on: [T-192, T-154]
type: task
refs: [W48, F14, T69, I17]
---

## Goal

A learner can choose or disable a routine and see a neutral in-app cue on web.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Shared EN/PL routine/timezone/quiet-hour/profile-owner preferences and port; web implements in-app cue only, no push. Default off, selected reminder owner and Today/resume link with no pending-answer leak; native scheduling separately allocated.

Out (do not do in this task):

- Native plugin/permission changes, cloud services, runtime pack updates or unrelated study UI.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given no opt-in, when settings open, then no permission request occurs and study stays fully usable (e2e).
- [ ] AC2: Given changed routine/zone/quiet hours, when saved, then the inspector plan reflects persisted values and a neutral web cue respects them (unit and e2e).
- [ ] AC3: Given disabled routine or another selected profile, when reopened, then stale ownership clears without hidden Web Push or answer reveal (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/settings/routine/`, `tests/integration/m7-m8/t-207/`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
