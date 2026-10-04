---
id: T-222
title: Download selected audio and image packs explicitly
status: todo
size: M
depends_on: [T-221, T-118]
type: task
refs: [W32, W34, T41, F11]
---

## Goal

A PWA learner can choose a size-aware audio/image download and verify selected audio works offline.

## Context

- Blueprint §§14.4, 15, 18.1; use T-118 approved assets and T-221 staging.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Select optional media by pack and hash, show download bytes and capability changes, cancel/resume safely and report broken assets. Verified downloaded audio takes precedence over capability-qualified local TTS; do not promise a remote voice works offline.

Out (do not do in this task):

- New audio generation, recording, native storage and personal-media deletion.

## Acceptance criteria

- [ ] AC1: Given selected approved audio/images, when download finishes and networking is disabled, then a production restart resolves the same verified assets and plays selected audio (integration and e2e).
- [ ] AC2: Given missing/corrupt media or download cancellation, when the learner opens an audio-dependent task, then only dependent capabilities are unavailable with retry/download actions and no learner penalty (unit and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/packs/media-download/`, `src/platform/web/pack-media/`, `e2e/selected-media.spec.ts`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
