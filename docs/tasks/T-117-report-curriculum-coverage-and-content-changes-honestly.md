---
id: T-117
title: Report curriculum coverage and content changes honestly
status: todo
size: M
depends_on: [T-108, T-109, T-114, T-116]
type: task
refs: [W18, W20, F04, F08, T43, T50]
---

## Goal

A contributor can distinguish source-candidate coverage, actual sense coverage and release readiness before publishing a change.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; `docs/adr/0005-source-and-ai-content-review.md` (accepted).
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.
- Research data, packets, schemas and Python prototypes: `research/content-2026-10/` (see its `README.md`).

## Scope

In:

- Report counts by locale/task/theme/review state and compare an explicit target manifest to seed/sense mappings.
- Show semantic diffs, aliases and reviews invalidated by edits; identify sample and source-family denominators.

Out (do not do in this task):

- Claiming headword overlap equals sense coverage or estimating an unknown language error rate as zero.

## Acceptance criteria

- [ ] AC1: Given the provisional 5,000-candidate baseline, when coverage runs, then 2,120 headword matches and 2,880 misses are labelled candidate counts, not verified sense coverage. (integration)
- [ ] AC2: Given a sense split or article change, when diffed, then progress-impacting/new-app identity consequences and invalidated checks are visible. (unit)
- [ ] AC3: Given batches without a sample check, when coverage runs, then their entries are reported as language check not_run, separately from batch_checked and ai_reviewed, with sampled/total denominators per batch. (unit)

## Notes for the implementer

Keep this one reviewable PR. Port/reuse the research algorithms in the repository's TypeScript/CLI conventions; the research Python scripts are evidence/prototypes, not a new runtime dependency. Prefix tests with relevant blueprint IDs. Run the repository's required verification gates for changed behavior; never record an unexecuted gate as passed. Preserve source text, IDs and review provenance. Do not edit protected agent/workflow files or introduce legacy progress migration. Stop to split implementation if it exceeds the repository's S/M logic budget; large fixed data fixtures do not justify a larger behavioral scope.

## Notes for the reviewer

Check the observable acceptance criteria, exact evidence/units and failure paths. Source support is not linguistic approval; imported drafts cannot self-certify. Confirm no credentials, model call, hidden network fallback, source erasure or fabricated review appears in the app/tooling. A language check is an actual, recorded sample check of a generation batch (ADR 0005); a code review alone does not check the Dutch.
