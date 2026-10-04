---
id: T-204
title: Run optional support comparisons with safe opt-out
status: todo
size: M
depends_on: [T-203, T-201, T-193]
type: task
refs: [W31, F05, F09, T30]
---

## Goal

A learner can opt into a personal support comparison and abandon an unhelpful condition.

## Context

- Blueprint §§4, 7–10, 15, 18.5, 19, 22, 25; W26–W31/W48.
- `docs/architecture/README.md`; ADRs 0003–0005; T-013 handoff.
- Reuse M4 learning/repair/adaptation and M2 personal-media/portable-backup contracts.

## Scope

In:

- Opt-in setup, fixed assignments, equal opportunities/time covariates, predefined delayed probes and explicit intervening-practice choice. Label probe versus ordinary scheduled review; allow immediate crossover/withdrawal without withholding feedback.

Out (do not do in this task):

- Native plugin/permission changes, cloud services, runtime pack updates or unrelated study UI.
- Automatic linguistic approval or a second scheduler/identity authority.

## Acceptance criteria

- [ ] AC1: Given an opted-in comparison, when reopened, then stable conditions and actual support/time/exposure covariates persist (integration and e2e).
- [ ] AC2: Given withdrawal or support replacement, when selected, then crossover is recorded and normal study continues immediately (e2e).
- [ ] AC3: Given a handful of outcomes or missing probes, when results open, then sample sizes, uncertainty and attrition replace a claim that a technique is proven (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/progress/comparisons/`, `tests/integration/m7-m8/t-204/`.
Reuse existing IDs, content/runtime contracts and atomic repositories; no fabricated linguistic
review, runtime AI, remote transcription, analytics vendor or legacy progress import. Shared UI
has EN/PL controls and screenshot-backed e2e. Phone checks require actual owner-provided results;
CI emulator tests do not prove physical microphone/notification quality.

## Notes for the reviewer

Check privacy, explicit capability failures, exact media hashes and qualified evidence.
Keep each slice within S/M; local experiment outcomes cannot establish scientific efficacy.
