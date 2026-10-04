---
id: T-159
title: Study reviewed productive and receptive tasks with honest feedback
status: todo
size: M
depends_on: [T-157, T-155, T-154, T-153]
type: task
refs: [W14, W15, T04, T08, T09, T10, T11, T12, I03, I04, I09, I17, F01]
---

## Goal

A PWA learner can study one admitted sense through teaching, productive/receptive recall, optional typing or locked self-report, then read feedback and explicitly continue or finish.

## Context

- Blueprint §§9.2–9.3, 10, 16 and scenarios 26.1–26.2; ADRs 0004/0005.
- Reuse teaching/attempt/commit commands T-148–T-150, live planner/budgets T-156–T-157, T-155 evaluator and T-119 audio service.

## Scope

In:

- Study route showing one clear sense, noun article, reviewed translated example and available pronunciation with honest fallback.
- Productive PL/EN cue versus Dutch receptive cue with separate task identity/evidence; use only eligible task/locale contracts.
- Optional typed response or Check my answer declaration before feedback, distinct I need the answer, gradual supported help and explicit evidence-source labels.
- Show initial and assisted final result, component article/spelling feedback and evaluator correction entry point; Next/finish remains explicit and failed saves retain the draft.

Out (do not do in this task):

- Focused picture/listening/article/cloze UI (M6), recording, full support editor, native wiring or service-worker update policy.

## Acceptance criteria

- [ ] AC1: Given an admitted starter with a productive/receptive contract, when taught then answered after an injected eligible gap, then one real scheduled grade saves and switching task family never copies measured mastery (e2e).
- [ ] AC2: Given Check my answer versus I need the answer, when feedback opens, then the first locks a labelled self-report and preserves independence while the second is omission/reveal; feedback never changes the locked response (e2e).
- [ ] AC3: Given typed alternative/typo/article cases, when submitted, then the reviewed contract yields the expected separate judgment/repair or correction action without a second schedule update (unit and e2e).
- [ ] AC4: Given unavailable audio, a long pause, keyboard input or a failed save, when study continues, then written supported study remains possible, no target autoplays before production and no false penalty/automatic advance/saved state occurs (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/study/core/`, `src/features/study/feedback/`, `src/app/routes.ts`, `src/i18n/`, `e2e/study-core.spec.ts`.
Starter study: yes. T-148 transitively requires T-120; render only its currently eligible subset. Reuse T-153 correction API; this task need not implement undo and cannot invent reviewer evidence. EN/PL UI/cue choices remain independent. End e2e flows with review screenshots.

## Notes for the reviewer

Keep this to the everyday productive/receptive slice. No target in accessible labels/hidden DOM before response, no forced countdown or speech permission.
