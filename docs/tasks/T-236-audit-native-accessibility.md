---
id: T-236
title: Verify native font keyboard Back and TalkBack paths
status: todo
size: M
depends_on: [T-235, T-163]
type: task
refs: [W35, W50, T45, T47, T68, F12, F14]
---

## Goal

An Android learner can study with scaled text and system navigation while retaining draft/help state.

## Context

- Blueprint §§16, 18.4; shared accessible UI from T-235 and real SQLite study.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Fix native safe-area/system-bar/IME resizing and Back priority (overlay, navigation, checkpoint/exit). Add emulator tests for font scale, keyboard/background/process recreation and answer secrecy; provide exact-version TalkBack owner checklist and an importable result/blocker, without calling browser trees a TalkBack result.

Out (do not do in this task):

- Audio recording/focus implementation owned by M7, reminders and claiming physical checks ran without evidence.

## Acceptance criteria

- [ ] AC1: Given scaled fonts, open keyboard and active hinted draft, when Back/background/process recreation runs, then controls remain visible, overlays close first and the same draft/help resumes without a new grade (device test).
- [ ] AC2: Given article task and actual TalkBack result or unavailable phone, when audit evidence is recorded, then answer secrecy is checked on CI and the exact physical result or blocker stays separately labelled (integration and device test).

## Notes for the implementer

Native work: yes. Primary files: `src/platform/android/accessibility/`, `e2e-android/native-accessibility.spec.ts`, `docs/accessibility/android-audit.md`.
Native build/emulator execution is CI-only. Owner physical/signing/access evidence stays separate; unavailable prerequisites are precise blockers, never simulated passes.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
