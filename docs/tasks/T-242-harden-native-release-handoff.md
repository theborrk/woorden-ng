---
id: T-242
title: Gate final native release and internal-testing handoff
status: todo
size: M
depends_on: [T-229, T-240, T-167]
type: task
refs: [W37, W49, W50, T67, T70, T74, T75, F13, F14]
---

## Goal

The owner can prepare a final signed candidate with explicit integrity/device/compatibility and Play-access gates.

## Context

- Blueprint §§23.2–23.5; extend first-build/handoff tools rather than a second signing system.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Aggregate current full integrity/backup/offline/upgrade/ABI gates, dependency/license metadata and signed hashes. Update internal-testing runbook, permission/data declarations and upload-key/forward-repair recovery. Extend focused release workflow only; .github/workflows/android-release.yml is explicitly permitted. Require actual same-track Play install/update result or precise Console/signing/authorization blocker.

Out (do not do in this task):

- Automatic public rollout, Play API automation, real keys/tester identities in git or claiming a sideload certificate proves a Play update.

## Acceptance criteria

- [ ] AC1: Given complete integrity/ABI evidence and owner signing bindings, when candidate preparation runs, then verified signed AAB/APK and exact metadata are produced and CI-device offline/resume/export pass (integration and device test).
- [ ] AC2: Given missing signing/Console/access/baseline or failed gate, when handoff is validated, then unsigned independent work finishes but exact external blockers remain and no install/update/release is falsely claimed (integration).
- [ ] AC3: Given an actual same-track Play update result, when evidence is imported, then installed version/certificate and retained history/draft/media are recorded without uninstall (integration).

## Notes for the implementer

Native work: yes. Primary files: `tools/release/final-native/`, `.github/workflows/android-release.yml`, `docs/release/final-native.md`, `e2e-android/final-release.spec.ts`.
Native build/emulator execution is CI-only. Owner physical/signing/access evidence stays separate; unavailable prerequisites are precise blockers, never simulated passes.
The named protected workflow/build files are explicitly authorized for this future task only; agent/review policy and permanent identity remain protected.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
