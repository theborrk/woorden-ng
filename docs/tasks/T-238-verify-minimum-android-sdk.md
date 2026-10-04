---
id: T-238
title: Establish executable minimum SDK and WebView evidence
status: todo
size: M
depends_on: [T-005]
type: task
refs: [W36, W50, T75, F14]
---

## Goal

A maintainer can distinguish a verified minimum Android SDK from an emulator with an unusably old WebView.

## Context

- Blueprint ADR 0003 §5 and §§18.7, 22.5; current API36 CI does not prove API24.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Test whether a Play-enabled minimum-SDK image can load the required WebView and pinned native plugins; record exact API/WebView/ABI. Add focused CI minimum-SDK job if reproducible, otherwise prepare owner physical check with an explicit pending blocker. Propose any minimum-SDK increase in PR assumptions; do not silently raise it.

Out (do not do in this task):

- Installing Android SDK in the agent environment, unverified minimum claims, changing identity/signing and broad CI policy changes.

## Acceptance criteria

- [ ] AC1: Given a CI minimum-SDK image with compatible WebView, when installed APK SQLite/file/core shell smoke runs, then actual API/WebView/ABI and successful native plugin results are recorded (device test).
- [ ] AC2: Given an image whose WebView cannot run the build or missing physical evidence, when minimum support evidence is validated, then the case stays blocked with reproducible cause/owner steps and API36 success never substitutes (integration and device test).

## Notes for the implementer

Native work: yes. Primary files: `e2e-android/minimum-sdk.spec.ts`, `tools/testing/minimum-sdk/`, `.github/workflows/minimum-sdk.yml`, `docs/testing/minimum-sdk.md`.
Native build/emulator execution is CI-only. Owner physical/signing/access evidence stays separate; unavailable prerequisites are precise blockers, never simulated passes.
The named protected workflow/build files are explicitly authorized for this future task only; agent/review policy and permanent identity remain protected.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
