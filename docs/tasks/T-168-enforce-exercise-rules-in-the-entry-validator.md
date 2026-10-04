---
id: T-168
title: Enforce the exercise rules in the entry validator
status: done
size: M
depends_on: [T-110]
type: task
refs: [W18, W24, F08]
---

## Goal

A contributor learns from the validator, before any check or study, when an entry's exercises would
reject correct answers or carry placeholder data (rules R1–R5 of ADR 0005).

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§10, 14, 22 and the refs above.
- Policy: `docs/adr/0005-source-and-ai-content-review.md` (exercise rules R1–R5, sampled checks,
  reports); `docs/content/verification-pipeline.md` (the rules with the batch 01 examples).
- Batch 01 findings: `research/content-2026-10/review/responses/summary-01.md` and `work-01/`.
- Extends T-110's validator and schema in `tools/content/`.

## Scope

In:

- Schema support for what the rules need: a structured cue on fill-in and production examples
  (tense and person for verb answers), several accepted answers per example (the first one still
  matches the answer span), and a self-graded marker for whole-sentence production.
- Validator checks: R1 a verb-form answer without tense and person in its cue; R2 a whole-sentence
  answer with a single accepted answer and no self-graded marker; R3 a cue gloss containing one of
  the accepted answers or another listed form of the target; R4 placeholder forms ("-", empty) and a
  predicative example linked to an attributive form; R5 meta wording such as "in this context" in
  learner-facing meanings. Each finding names the rule, entry and example.
- The validator's error list stays machine-readable, so authoring briefs (T-122) can quote it.

Out (do not do in this task):

- Changing the starter pilot's data (T-169) or any language-check status.
- Judging synonyms or naturalness: the validator checks structure, not Dutch.

## Acceptance criteria

- [x] AC1: Given the batch 01 cases (S02 "Ik ___ ziek." without a tense cue, S04 one accepted
      answer, S08 a single-string sentence, S09 the cue "possess"), when validated, then each fails
      with the matching rule ID, and the corrected versions pass. (unit)
- [x] AC2: Given S03 with the form "-" and S07 with "in this context" in its meanings, when
      validated, then R4 and R5 findings name the entry and field. (unit)
- [x] AC3: Given an entry with three accepted answers or a self-graded sentence, when validated,
      then it passes and the answer-span round trip of T-110 still holds for the first answer. (unit)

## Notes for the implementer

Keep T-110's existing checks and tests passing. R3 compares normalized words, not substrings ("u" in
"you" is not a hit). Prefix tests with blueprint IDs where they prove one (T44 for spans).

## Notes for the reviewer

The rules come from real findings; check each rule against its batch 01 example. The validator must
not claim language quality: passing R1–R5 does not set any language-check status.
