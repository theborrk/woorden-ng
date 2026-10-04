---
id: T-160
title: Choose one optional support and repair recurring difficulty
status: todo
size: M
depends_on: [T-159]
type: task
refs: [W14, T06, T25, I03, I11, F01, F04]
---

## Goal

A learner can choose one helpful existing association/image or none, then repair or postpone a difficult item while other study continues.

## Context

- Blueprint §§9.2, 10.4–10.5 and scenario 26.1; ADR 0005.
- Reuse reviewed support resources from T-120 and T-149 assistance/feedback phases.

## Scope

In:

- One optional existing hook/mnemonic image in teaching and Another way to remember/None/does not help choices.
- Extra support opened during recall is persisted assistance; learner-chosen support selection is profile-scoped.
- Configurable repair trigger after three eligible initial failures across two sessions or repeated specific confusion.
- Minimal clarify/contrast-existing-supported-cue/postpone actions, reason/history and follow-up evidence; postponement changes the presentation gate only.

Out (do not do in this task):

- Personal image import/recording/support editor, generation, new picture-naming task UI or full diagnostic dashboard.

## Acceptance criteria

- [ ] AC1: Given reviewed optional supports, when one or None is chosen at teaching, then the selection survives restart and choosing none permits ordinary study without mandatory hook creation (e2e).
- [ ] AC2: Given difficulty during an attempt, when a mnemonic image/sound support is opened, then assistance is recorded before display and assisted final success cannot become independent mastery (e2e).
- [ ] AC3: Given three eligible failures in two sessions or repeated specific confusion, when the repair threshold is reached, then one relevant supported action is offered while other concepts remain available (unit and e2e).
- [ ] AC4: Given a postponed difficult item or a changed support, when later checked, then history/raw due remains intact and intervention/evidence is retained without a permanent learned flag or global lockout (integration and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/application/learning/repair/`, `src/features/study/supports/`, `src/features/study/repair/`, `e2e/study-repair.spec.ts`.
Starter study: yes. Show only actually reviewed resources; no placeholder image/hook. Existing support IDs and content provenance are authoritative. Use declared primary-cue roles, not a blanket image penalty.

## Notes for the reviewer

Scope is a small support-selection/repair flow, not M7 media editing. Use failure denominators excluding invalid/practice-only trials.
