---
id: T-240
title: Gate native release on ABI and library compatibility
status: todo
size: M
depends_on: [T-165, T-238]
type: task
refs: [W37, W49, W50, T70, T75, I24, F14]
---

## Goal

A maintainer can detect unsupported native libraries or runtime integrations before a release is labelled ready.

## Context

- Blueprint §§18.4, 23.2; recheck current official Play target SDK/page-size requirements when implementing.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Inventory locked plugins/licenses/toolchains and APK/AAB native libraries across declared ABIs; inspect ELF/page-size packaging compliance and run plugin load tests on supported images. Audit built native assets/network for server.url/SW/provider credentials/AI SDKs. Fix only demonstrated compatibility issues and explicitly authorize android/ build/toolchain changes plus focused .github/workflows/native-compatibility.yml.

Out (do not do in this task):

- Play distribution, secrets in fixtures, broad workflow/review policy edits or removing required plugin behavior to pass.

## Acceptance criteria

- [ ] AC1: Given the locked release and declared ABI matrix, when packaged-library inspection and plugin smoke run, then each supported ABI has verified native libraries/plugin loading and dated official compliance evidence (integration and device test).
- [ ] AC2: Given a noncompliant ELF fixture or forbidden built asset/network endpoint, when release audit runs, then the specific gate fails with no artifact declared release-ready (integration and device test).

## Notes for the implementer

Native work: yes. Primary files: `tools/release/native-compatibility/`, `e2e-android/native-compatibility.spec.ts`, `android/`, `.github/workflows/native-compatibility.yml`, `docs/release/native-compatibility.md`.
Native build/emulator execution is CI-only. Owner physical/signing/access evidence stays separate; unavailable prerequisites are precise blockers, never simulated passes.
The named protected workflow/build files are explicitly authorized for this future task only; agent/review policy and permanent identity remain protected.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
