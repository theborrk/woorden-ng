---
id: T-235
title: Audit EN PL and accessible shared study flows
status: todo
size: M
depends_on: [T-180, T-181, T-183, T-188, T-199, T-204, T-206, T-207]
type: task
refs: [W35, T45, T46, T47, F12, F13]
---

## Goal

A learner can study in EN or PL with keyboard, zoom and reduced motion without answer leaks.

## Context

- Blueprint §16 and T45–T47; audit actual supported shared task routes as present on main.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Complete missing interface strings and an executable audit across onboarding, Today, every implemented task family, packs and recovery. Verify independent cue language/evidence, semantic labels/focus, 44px controls, 360px width, zoom, contrast and reduced motion. Include article/picture accessibility answer-leak checks; list absent repertoire as a blocker for final audit rather than pretend coverage.

Out (do not do in this task):

- Native TalkBack/insets, inventing translations/reviewed content or implementing missing task families.

## Acceptance criteria

- [ ] AC1: Given EN/PL UI and a fixed cue-language task, when UI locale changes, then all audited labels/errors change language while task cue identity and historical evidence remain unchanged (unit and e2e).
- [ ] AC2: Given article/picture tasks before response, when keyboard and accessibility-tree inspection runs, then no hidden label/color/audio reveals the answer and an accessible alternative records its cue family (e2e).
- [ ] AC3: Given 360px width, 200 percent zoom and reduced motion, when all audited flows are navigated by keyboard, then visible focus and labelled 44px controls remain usable without a forced timer (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/accessibility/`, `src/i18n/`, `e2e/shared-accessibility.spec.ts`, `docs/accessibility/web-audit.md`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
