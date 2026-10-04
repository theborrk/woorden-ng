---
id: T-165
title: Prepare credential-gated signed AAB and APK artifacts
status: todo
size: M
depends_on: [T-164, T-141, T-158]
type: task
refs: [W49, W47, T70, I17]
---

## Goal

A maintainer can produce first-family signed artifacts when owner credentials exist, or obtain an exact signing/setup blocker without treating an unsigned build as released.

## Context

- Blueprint §§23.1–23.3 and M4 release gates; T-164 offline study and T-141 verified backup interoperability.
- Reuse existing version scripts/Android identity; owner supplies permanent ID confirmation, upload keystore/password bindings outside source.

## Scope

In:

- First-release signing configuration and workflow using protected CI secret bindings, increasing versionCode and current build targets.
- Explicitly authorized protected edits for this future task: signing/version configuration in `android/app/build.gradle` and a focused `.github/workflows/android-release.yml`; do not alter agent/review policy.
- Preflight/run artifacts with source/toolchain/lockfile/content/schema/parameter versions, checksums and gate results; signed AAB and signed test APK paths.
- Inspect native packaged assets for no development server.url, SW registration, provider secrets/runtime AI; block release if integrity/offline/backup gates or credentials are missing.

Out (do not do in this task):

- Play upload/rollout, changing permanent identity without owner confirmation, bypassing review gates or full M10 ABI/release hardening.

## Acceptance criteria

- [ ] AC1: Given required signing bindings and passed study/integrity/backup gates in CI, when the release workflow runs, then AAB/APK signatures and checksums validate and metadata names the exact source/content/schema/toolchain versions (integration).
- [ ] AC2: Given a missing binding or failed release gate, when preflight runs, then it returns a specific blocker and emits no artifact labelled signed or released, while ordinary debug/web checks still work (integration).
- [ ] AC3: Given the built APK installed on the CI device, when packaged assets/network behavior are inspected and core study runs, then no server.url/SW/provider secret/runtime AI is present and bundled study works offline (integration and device test).

## Notes for the implementer

Native work: yes. Primary files: `tools/release/first-build/`, `.github/workflows/android-release.yml`, `android/app/build.gradle`, `docs/release/first-build.md`, `e2e-android/release-assets.spec.ts`.
Starter study: yes. This future task explicitly permits the named protected signing/workflow files only. Never put real keys/passwords in logs or fixtures; local preflight tests use synthetic binding metadata, CI signs with protected owner secrets. Native compile/sign/device runs are CI-only. Missing owner credentials are a reported release blocker, not fabricated execution.

## Notes for the reviewer

M4 prepares the first release; comprehensive current Play ABI/page-size/toolchain hardening stays with M10. No distribution authorization is implied by artifact preparation.
