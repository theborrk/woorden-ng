---
id: T-171
title: Turn content reports into a fix batch
status: todo
size: S
depends_on: [T-113, T-170]
type: task
refs: [W19, F08]
---

## Goal

A contributor can import copied reports, see them grouped per entry, and start a fix batch whose
changed entries go through one small sample check.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§10, 14, 22 and the refs above.
- Policy: `docs/adr/0005-source-and-ai-content-review.md` (exercise rules R1–R5, sampled checks,
  reports); `docs/content/verification-pipeline.md` (the rules with the batch 01 examples).
- Batch 01 findings: `research/content-2026-10/review/responses/summary-01.md` and `work-01/`.
- T-170's report format (`docs/content/reports.md`); T-112/T-113 for the check.

## Scope

In:

- A `content:reports` command: import report JSON (deduplicated by report), group per entry,
  mark reports whose content hash is no longer current as stale, and write a report summary.
- Create a fix-batch manifest from the entries a contributor changes in response, ready for
  `content:sample` (T-112); a reported entry becomes flagged until its fix batch passes.

Out (do not do in this task):

- Writing the fixes themselves or calling any model.

## Acceptance criteria

- [ ] AC1: Given the same reports imported twice and one report on an old hash, when summarized,
      then each report appears once and the old one is marked stale. (unit)
- [ ] AC2: Given three fixed entries, when the fix batch is created and exported, then the manifest
      lists exactly those entries with their new hashes and all three are sampled. (integration)

## Notes for the implementer

Reuse T-112/T-113 rather than a second check path. Keep reports as evidence next to the batch.

## Notes for the reviewer

Reports never change content or statuses by themselves; only an imported check does.
