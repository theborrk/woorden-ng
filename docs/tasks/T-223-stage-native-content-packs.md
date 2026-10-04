---
id: T-223
title: Activate native packs only after durable file verification
status: todo
size: M
depends_on: [T-221, T-135, T-164]
type: task
refs: [W32, T40, T65, T66, I21, F14]
---

## Goal

An Android learner can download optional packs without losing bundled offline study when file writes are interrupted.

## Context

- Blueprint §§18.4, 18.6; reuse T-135 durable files and T-164 bundled starter.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Wire shared pack validation to native persistent files and SQLite active pointers. Journal staged writes, verify every required file before activation, recover interruptions and clean disposable staging; preserve personal files and prompt revisions. Keep executable assets bundled and app updates separate.

Out (do not do in this task):

- New pack/compiler behavior, replacing the backup importer, app signing or app-code downloads.

## Acceptance criteria

- [ ] AC1: Given the installed bundled starter with networking disabled before first launch, when study and declared starter audio run, then both work through native storage without a website or SW (device test).
- [ ] AC2: Given an optional pack with an interrupted write, missing file or bad checksum, when the process restarts, then the previous pack stays active and journal cleanup/retry cannot activate missing assets (integration and device test).
- [ ] AC3: Given a complete optional pack, when all hashes are verified and its pointer commits, then offline browsing/audio use persistent files and executable payloads remain rejected (device test).

## Notes for the implementer

Native work: yes. Primary files: `src/platform/android/packs/`, `e2e-android/native-pack-install.spec.ts`.
Native build/emulator execution is CI-only. Owner physical/signing/access evidence stays separate; unavailable prerequisites are precise blockers, never simulated passes.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
