---
id: T-239
title: Record actual installed PWA and phone verification
status: todo
size: M
depends_on: [T-237, T-236, T-189, T-208, T-200, T-238, T-225]
type: task
refs: [W36, W50, T41, T65, T68, F12, F14]
---

## Goal

The owner can execute installed PWA/native checks and retain exact physical-device results or blockers.

## Context

- Blueprint §§18.7, 22.5; phone access is owner-provided, agent device execution stays CI-only.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Provide evidence schema/importer and concise manual cases for actual Android Chrome installed PWA offline/update, midrange phone and owner phone native offline/restart/audio focus/microphone/voices/TalkBack. Record OS/browser/WebView/device/build versions; optional iPhone Safari/home-screen remains unadvertised until actual verification. CI smoke is separate evidence.

Out (do not do in this task):

- Fabricating physical runs, collecting personal answers, implementing M7 recorder or claiming emulation proves installation.

## Acceptance criteria

- [ ] AC1: Given actual owner results with exact device/build versions, when evidence is imported, then passed/failed/unexecuted cases and installed PWA versus native provenance remain distinct (integration).
- [ ] AC2: Given no physical phone/access or failed audio/TalkBack check, when matrix is validated, then missing capability remains an explicit blocker and unsupported iPhone support is not advertised (integration).
- [ ] AC3: Given the candidate installed on the CI emulator, when offline/restart smoke runs, then real native core behavior is checked and labelled emulator evidence only (device test).

## Notes for the implementer

Native work: yes. Primary files: `tools/testing/physical-evidence/`, `docs/testing/physical-matrix.md`, `e2e-android/physical-matrix-smoke.spec.ts`.
Native build/emulator execution is CI-only. Owner physical/signing/access evidence stays separate; unavailable prerequisites are precise blockers, never simulated passes.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
