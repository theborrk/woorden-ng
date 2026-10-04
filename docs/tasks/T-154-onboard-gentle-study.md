---
id: T-154
title: Offer skippable EN and PL setup with gentle study preferences
status: todo
size: M
depends_on: [T-126, T-119]
type: task
refs: [W14, F01, F04, I17]
---

## Goal

A new learner can choose an everyday goal, cue language and gentle workload, check available audio and start without typing, recording or a placement test.

## Context

- Blueprint §§9.1, 16 and 25; ADR 0004.
- Reuse T-126 profile/preferences flow and T-119 truthful audio capability/check UI.

## Scope

In:

- Short skippable first-run setup in EN/PL with independent cue locale, goal/theme preferences and gentle defaults.
- Two new concepts/day, ten-minute target, six active acquiring tasks, optional audio, no notification opt-in by default; allow zero and higher manual introduction caps.
- Optional audio check via existing service, including unavailable/untested states; setup completes offline without microphone or account.
- Preserve existing selected profile/languages on re-entry; configuration only until study commands are wired.

Out (do not do in this task):

- Content loading/review, diagnostic placement, personal word creation, audio plugins/recording or reminders.

## Acceptance criteria

- [ ] AC1: Given a fresh profile, when setup is skipped or completed in EN/PL, then saved choices/defaults remain after restart and no placement test or microphone permission is required (e2e).
- [ ] AC2: Given PL cues with EN UI, when setup changes the interface or everyday goal/theme, then cue language remains explicit and profile defaults are preserved independently (unit and e2e).
- [ ] AC3: Given zero or higher manual daily cap, when saved, then the chosen value survives without silently clamping to the automatic one-to-five range (integration and e2e).
- [ ] AC4: Given unavailable or untested Dutch audio, when the audio check runs offline, then the existing capability state is truthful and setup still completes for written study (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/onboarding/`, `src/application/onboarding/`, `e2e/onboarding.spec.ts`, `src/i18n/`.
Starter study: no. Do not instantiate drafts or starter lessons here. Use real existing preferences and audio services; no second store/probe. Workload recommendations appear later in T-158.

## Notes for the reviewer

The setup is a working preference flow, not a claim that all later task types or themes are available.
