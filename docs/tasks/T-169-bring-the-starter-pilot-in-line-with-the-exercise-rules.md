---
id: T-169
title: Bring the starter pilot in line with the exercise rules
status: done
size: M
depends_on: [T-116, T-168]
type: task
refs: [W20, F04, F08]
---

## Goal

All 60 starter entries pass the exercise rules, so the pilot can go to its one sample check as a
single generation batch.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§10, 14, 22 and the refs above.
- Policy: `docs/adr/0005-source-and-ai-content-review.md` (exercise rules R1–R5, sampled checks,
  reports); `docs/content/verification-pipeline.md` (the rules with the batch 01 examples).
- Batch 01 findings: `research/content-2026-10/review/responses/summary-01.md` and `work-01/`.
- The pilot as imported by T-115 and T-116; T-168's validator.

## Scope

In:

- Apply batch 01's proposed patches (`work-01/S*.json`, `proposed_patch`) to S01–S10 where they
  fix a rule finding.
- Fix every R1–R5 finding in S11–S60 the same way: tense and person in verb cues, the common
  equivalents as accepted answers, self-graded or listed variants for sentences, clean glosses, no
  placeholders. Keep source-verified facts unchanged.
- Record the change as one generation batch (author vendor and model as actually known, input and
  output hashes) with a change report per entry; every changed entry's language check is not_run.

Out (do not do in this task):

- New senses, new facts without a source, or any language-check or release status.

## Acceptance criteria

- [x] AC1: Given the updated pilot, when validated with T-168's rules, then all 60 entries pass and
      every source-verified fact is byte-identical to before. (integration)
- [x] AC2: Given the change report, when inspected, then each changed entry lists the rule it fixes
      and its old and new hash, and its language check is not_run. (unit)

## Notes for the implementer

This is authoring work on Dutch content: choose accepted alternatives conservatively (common,
standard Netherlands Dutch) and list them in the PR body per entry, so the sample check can judge
them. Do not mark anything checked.

## Notes for the reviewer

Look at the per-entry alternatives in the PR body. Code review does not check the Dutch; the sample
check does (T-120).
