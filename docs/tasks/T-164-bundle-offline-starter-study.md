---
id: T-164
title: Bundle verified starter lessons and declared audio for first native launch
status: todo
size: M
depends_on: [T-163]
type: task
refs: [W47, T65, I17, F01, F04]
---

## Goal

A freshly installed Android app can teach and study its admitted starter subset and play declared starter recordings before its first network connection.

## Context

- Blueprint §18, T65 and M4 exit; ADR 0005.
- T-120 owns admission; T-118/T-119 own reviewed audio QA/capabilities; T-163 runs real native study.

## Scope

In:

- Bundle only admitted task/locale contracts and hash/license-verified approved starter media from existing compiler outputs.
- Offline-ready bootstrap and diagnostics distinguishing bundled lesson, declared recording coverage and optional local TTS.
- Build-time rejection of missing/hash-mismatched required media; no runtime pack download or silent online fallback.
- First-install initialization into real SQLite using existing commands; preserve installed data on subsequent launches.

Out (do not do in this task):

- New audio source import/QA, pack installer/cache manager, fake recordings, language review or release signing.

## Acceptance criteria

- [ ] AC1: Given a newly installed CI APK with empty app data and networking disabled before first launch, when the starter lesson is taught/graded/resumed, then shared study works through real SQLite without any initial download (device test).
- [ ] AC2: Given declared bundled starter recordings and no usable Dutch TTS, when played offline on first launch, then actual approved recordings complete playback and lesson/audio readiness reports exact bundled coverage (device test).
- [ ] AC3: Given missing/mismatched required starter asset or ineligible entry, when building/bootstrapping, then validation fails or excludes the dependent task honestly and no fabricated audio/content is marked ready (integration and device test).
- [ ] AC4: Given a populated installation, when bootstrap runs again, then learner progress/drafts survive and bundled content updates never reset or silently reassign history (device test).

## Notes for the implementer

Native work: yes. Primary files: `tools/content/bundle-starter.ts`, `src/application/content/bundled-starter/`, `public/starter/`, `e2e-android/first-offline-study.spec.ts`.
Starter study: yes. T-120 and T-118 are transitive prerequisites through the existing study/setup chain. Do not require all 60 entries to pass: state exact admitted subset and recording coverage. Device tests are CI-only and must observe real playback, not just a resolved play promise.

## Notes for the reviewer

T65 requires first launch before network, not airplane mode after an online warm-up. Reviewed text admission alone does not confer audio readiness.
