---
id: T-229
title: Exercise full data retention across signed native upgrades
status: todo
size: M
depends_on: [T-228, T-166, T-200]
type: task
refs: [W33, W49, W50, T67, T68, F14]
---

## Goal

A maintainer can detect later-release upgrade regressions across supported schema/content histories.

## Context

- Blueprint §§18.6, 23.2; extend T-166 real signed baseline runner, do not duplicate it.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Add regression fixtures for historical prompt revisions, profiles, private-media references and interrupted operations. Run compatible signed candidate over a retained preceding release without uninstall; verify study and backup after migration and forward-repair recovery on failure.

Out (do not do in this task):

- Binary downgrade, fabricated prior release, automatic distribution or implementing missing personal-content features.

## Acceptance criteria

- [ ] AC1: Given compatible preceding signed release and candidate with supported history/media, when upgrade runs without uninstall, then IDs, schedules, draft/help, personal hashes and backup equality survive (device test).
- [ ] AC2: Given failed migration, incompatible certificate or absent baseline, when upgrade preflight/recovery runs, then a precise blocker or forward-repair path preserves data and unexecuted cases remain unexecuted (integration and device test).

## Notes for the implementer

Native work: yes. Primary files: `e2e-android/full-signed-upgrade.spec.ts`, `tools/release/upgrade/regressions/`, `docs/release/full-upgrade.md`.
Native build/emulator execution is CI-only. Owner physical/signing/access evidence stays separate; unavailable prerequisites are precise blockers, never simulated passes.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
