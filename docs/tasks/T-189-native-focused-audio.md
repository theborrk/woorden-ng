---
id: T-189
title: Verify native focused audio interruption recovery
status: todo
size: M
depends_on: [T-182, T-163]
type: task
refs: [W23, F07, T08, T48]
---

## Goal

An Android learner can recover a focused listening trial after audio focus or lifecycle interruption.

## Context

- Blueprint §§7, 10, 14–15, 22.3, W18–W25; `docs/architecture/README.md`.
- ADR 0003 and ADR 0005 (sample-check policy supersedes human-review wording).
- T-012 handoff; reuse T-100–T-122 and T-168–T-171 rather than duplicating their tooling.

## Scope

In:

- Native adapter wiring only for focus loss, route/headset changes, pause/resume and cancellation; use T-119 local capability service and SQLite checkpoint commands. Add a plugin only if verified adapter needs it; minimum permissions with declared justification.

Out (do not do in this task):

- Shared UI changes, recording or Android SDK installation.
- New generators, automatic linguistic approval or competing identity/eligibility contracts.

## Acceptance criteria

- [ ] AC1: Given playing local audio, when focus loss, headset change or pause occurs, then playback stops and the durable response draft survives (device test, CI emulator).
- [ ] AC2: Given a restart/resume or missing Dutch voice, when continued, then no target autoplays, no network fallback occurs and written alternatives save on SQLite (device test, CI emulator).
- [ ] AC3: Given interrupted playback before a valid response, when grading is requested, then technical failure produces no learner penalty (unit and device test, CI emulator).

## Notes for the implementer

Native work: yes. Primary files: `src/platform/android/focused-audio/`, `e2e-android/focused-audio.spec.ts`.
Reuse established schemas, IDs, ports and command transactions. No runtime AI, paid service,
remote ASR, legacy progress migration or fabricated review. Synthetic test fixtures never authorize
production content. Shared UI uses EN/PL resources and screenshot-backed e2e flows.

## Notes for the reviewer

Check exact hash-bound evidence, failures and task/cue identity. Stay within one S/M slice;
external language/visual/phone QA requires recorded real results, never simulated success.
