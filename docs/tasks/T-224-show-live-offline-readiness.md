---
id: T-224
title: Show readiness from the learner selected capabilities
status: todo
size: M
depends_on: [T-222, T-161]
type: task
refs: [W32, T41, F11]
---

## Goal

A learner can see accurate offline readiness on Today and study only tasks whose required assets are available.

## Context

- Blueprint §§18.1, 18.7; reuse T-220 observations and T-161 real Today/session flow.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Bind the shared readiness UI to selected content, app-shell availability and selected audio; recheck missing/evicted assets at task selection and expose download/retry controls. Preserve non-audio study when optional assets are absent; use injected capability ports for target composition.

Out (do not do in this task):

- Native adapter changes, new schedulers, coercing TTS availability and new pack installation.

## Acceptance criteria

- [ ] AC1: Given verified downloaded content/audio, when the production PWA is restarted offline, then Today names the separate available capabilities and selected study/audio actually work (e2e).
- [ ] AC2: Given an evicted required audio asset, when the next task is selected, then dependent tasks are excluded with an actionable reason while ordinary recall stays usable and history is unchanged (integration and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/today/offline/`, `src/application/packs/readiness/`, `e2e/live-offline-readiness.spec.ts`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
