---
id: T-144
title: Inspect assistance-aware attempt classification
status: done
size: M
depends_on: []
type: task
refs: [W12, T03, T04, T05, T06, T07, T08, T09, T14, I03, I04, I05, I06, I09]
---

## Goal

A contributor can classify a declared trial and inspect why it receives one rating or no rating, independently of response duration and presentation modality.

## Context

- Blueprint §§9.3, 10.1–10.4, 11.3, 22.1 and scenarios 26.1–26.3.
- T-123 owns persisted events; this inspector takes scoring inputs and produces a classification only.

## Scope

In:

- Pure grade mapping and a direct Node inspector for initial/final outcome, response lock, primary cue versus extra assistance, judgment source and trial mode.
- Good/effortful Hard/advanced independent Easy/Again/no-rating decisions with component results.
- Unsupported input, invalid prompt or unavailable required media gives no learner penalty; practice/probes never schedule.

Out (do not do in this task):

- Typed-text matching (T-155), repositories, real image/listening task UI, recording or automatic speech scoring.

## Acceptance criteria

- [x] AC1: Given an incorrect or omitted initial response followed by a hint and correct retry, when classified, then initial failure remains and exactly one Again is proposed for a valid eligible trial (unit and integration).
- [x] AC2: Given a correct response locked before feedback versus full reveal before responding, when classified, then the former stays independent and the latter records omission/reveal with Again (unit).
- [x] AC3: Given a primary referent image or permitted primary audio replay versus an extra mnemonic image/sound hint, when classified, then only the extra support prevents unaided evidence (unit).
- [x] AC4: Given long pauses, explicit effort/Easy choices, unavailable audio, invalid input, early practice or a standalone probe, when classified, then time alone never sets Hard/Again and non-scheduled or technical cases propose no transition (unit and integration).

## Notes for the implementer

Native work: no. Primary files: `src/domain/attempt-scoring/`, `tools/learning/inspect-scoring.ts`, `tests/fixtures/learning/scoring/`.
Keep package manifests and shared barrel files untouched. Pure injected data only; no runtime content schema or fake production study screen. Prefix scenario tests T03–T09/T14 and invariant tests with their IDs.

## Notes for the reviewer

The fixture matrix must distinguish the task contract from supports shown later. Recognition, self-report and typed judgment cannot be labelled as verified speech performance.
