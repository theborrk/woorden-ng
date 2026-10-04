---
id: T-158
title: Explain reversible introduction suggestions from sufficient evidence
status: todo
size: M
depends_on: [T-157]
type: task
refs: [W16, T24, T30, F03]
---

## Goal

A learner can see a modest introduction-cap suggestion with its denominator/reason, accept or undo it and disable adaptation without losing the manual cap.

## Context

- Blueprint §13.3 and central defaults in §25; T-146 delayed-evidence and T-157 budget queries.
- This is M4 initial workload policy; optimizer/experiments/full personalization stay with later W32–W35.

## Scope

In:

- Versioned initial policy using at least six eligible delayed observations across three days, reconsidered at most once per three study days.
- 85%/65% thresholds, burden/too-much signals, one-step changes within automatic one-to-five range and insufficient-data hold.
- Settings/Today recommendation with denominator, reason, accept/revert/disable controls; zero and higher manual values remain user choices.
- Persist decisions/preferences using existing commands; no scientifically precise forecast.

Out (do not do in this task):

- FSRS fitting, experiment assignment, full analytics dashboard or automatic whole-course pause.

## Acceptance criteria

- [ ] AC1: Given one new concept/day across enough days, when at least six eligible observations across three days accrue, then a later policy review may suggest one increase despite no two-word yesterday prerequisite (unit and e2e).
- [ ] AC2: Given tiny/noisy/assisted data or a review within three days of the last decision, when evaluated, then it holds the cap and explains the missing evidence without a precise learning claim (unit and e2e).
- [ ] AC3: Given sufficient 85%/65% boundary evidence and burden signals, when evaluated, then bounded one-step recommendations follow the declared policy and never automatically reduce below one (unit).
- [ ] AC4: Given manual zero/higher cap or a prior recommendation, when disabled/reverted, then saved manual choice and decision reason remain inspectable and live budget selection refreshes (integration and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/domain/introduction-adaptation/`, `src/application/session/adaptation/`, `src/features/settings/workload/`, `e2e/workload-suggestions.spec.ts`.
Starter study: yes. Initial app-shell Settings can display the recommendation before the full Study UI exists. Retain raw evidence and a reason/version; self-reported eligible recall is labelled with its actual source. No extra dependencies for later optimizer work.

## Notes for the reviewer

T30 covers conservative introduction decisions here, not later experimental/forecast conclusions.
