---
id: T-228
title: Recover native migrations and pack journals before study
status: todo
size: M
depends_on: [T-223, T-140]
type: task
refs: [W33, T66, T68, F14]
---

## Goal

An Android learner can restart after an interrupted schema/pack/import operation and recover a valid draft before studying.

## Context

- Blueprint §§17.4, 18.6; extend production SQLite/files startup, not the spike.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Coordinate compatible schema migrations and existing pack/import journals before normal screens. Persist semantic draft boundaries, keep private files outside bundled/cache paths, preserve help and reject unsupported forward schemas with local recovery/export.

Out (do not do in this task):

- New backup modes, app signing, reminders and fallback to WebView storage.

## Acceptance criteria

- [ ] AC1: Given process death during migration or pack/import activation, when the installed app restarts, then old or fully migrated data remains usable and incomplete files never activate (device test).
- [ ] AC2: Given a hinted draft or an unsupported newer DB, when startup recovery runs, then the valid draft retains help without duplicate grading or a preserved-data recovery screen blocks study (integration and device test).

## Notes for the implementer

Native work: yes. Primary files: `src/platform/android/update-recovery/`, `e2e-android/native-update-recovery.spec.ts`.
Native build/emulator execution is CI-only. Owner physical/signing/access evidence stays separate; unavailable prerequisites are precise blockers, never simulated passes.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
