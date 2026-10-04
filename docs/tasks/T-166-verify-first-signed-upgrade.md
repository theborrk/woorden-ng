---
id: T-166
title: Gate the first signed upgrade on retained study and backup data
status: todo
size: M
depends_on: [T-165]
type: task
refs: [W49, T67, T68]
---

## Goal

A maintainer can verify a candidate signed build upgrades the preceding compatible installation without uninstalling or losing progress, drafts or personal backup media.

## Context

- Blueprint §§23.2–23.5 and T67; T-165 supplies signed candidates and T-141 real backup/media fixtures.
- First release creates the baseline artifact needed by the following update; never invent a preceding release.

## Scope

In:

- CI upgrade verifier for baseline/candidate same application ID and compatible signing certificate, monotonic versionCode and retained data.
- Seed a real baseline install with synthetic graded history, hinted draft, profile settings and personal-media fixtures via existing services; install candidate over it.
- Verify schema open/migration, real study resumption, export/checksum integrity and separate installation identity.
- Explicit baseline-missing/signature-mismatch blockers; retain compatible baseline metadata/artifacts for the next release.

Out (do not do in this task):

- Binary/database downgrade, uninstall workaround, new restore/migration algorithms or claiming a sideloaded upload-key APK upgraded a Play-signed installation.

## Acceptance criteria

- [ ] AC1: Given compatible signed baseline/candidate APKs in CI, when the candidate upgrades the seeded baseline without uninstall, then progress/schedule/draft/help/profile/media hashes survive and study plus export still work (device test).
- [ ] AC2: Given no preceding signed baseline on the first release or mismatched ID/certificate/nonincreasing versionCode, when preflight runs, then it reports the exact blocked upgrade case and never labels an unexecuted upgrade as passed (integration).
- [ ] AC3: Given interrupted study before upgrade and a supported schema migration, when the upgraded process opens, then the draft resumes with exposures and no duplicate grade or reset is introduced (device test).

## Notes for the implementer

Native work: yes. Primary files: `tools/release/upgrade/`, `e2e-android/first-signed-upgrade.spec.ts`, `docs/release/upgrade-baseline.md`.
Starter study: yes. CI-only emulator execution; signed artifacts/secrets live outside git. A first candidate may be compared with a CI-signed preceding-commit test baseline for migration mechanics, labelled separately from a real preceding release. A missing real baseline remains explicit; this task records setup and tests blockers, not a claimed release upgrade.

## Notes for the reviewer

Real Play-installed upgrade evidence must come from the same Play track/certificate in T-167. Full later-release/device/ABI matrix remains M10.
