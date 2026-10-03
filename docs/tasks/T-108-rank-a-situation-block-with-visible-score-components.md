---
id: T-108
title: Rank a situation block with visible score components
status: todo
size: M
depends_on: [T-101, T-102]
type: task
refs: [W18, F04, F08]
---

## Goal

A contributor can select a small curriculum block and explain each inclusion, exclusion and dependency.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; `docs/adr/0005-source-and-ai-content-review.md` (accepted).
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.
- Research data, packets, schemas and Python prototypes: `research/content-2026-10/` (see its `README.md`).

## Scope

In:

- Implement the versioned 35/25/20/10/10 scoring configuration and deterministic tie-breaks.
- Require utility situations, theme coverage and construction links; keep imputation flags and learning bands separate from CEFR estimates.
- Run first on a 100-candidate fixture; export selected/missing/excluded report.

Out (do not do in this task):

- Claiming the supplied 5,000 provisional candidates are fully curated or adapting the learner scheduler.

## Acceptance criteria

- [ ] AC1: Given the same inventory/config, when ranked twice, then scores and ordering are identical with all components exposed. (unit)
- [ ] AC2: Given missing frequency or an MWE, when ranked, then neutral imputation is logged only in the score and corpus values remain null. (unit)
- [ ] AC3: Given uncovered situations and prerequisite constructions, when a block is filled, then constraints are recomputed and unsatisfied requirements are reported. (integration)

## Notes for the implementer

Keep this one reviewable PR. Port/reuse the research algorithms in the repository's TypeScript/CLI conventions; the research Python scripts are evidence/prototypes, not a new runtime dependency. Prefix tests with relevant blueprint IDs. Run the repository's required verification gates for changed behavior; never record an unexecuted gate as passed. Preserve source text, IDs and review provenance. Do not edit protected agent/workflow files or introduce legacy progress migration. Stop to split implementation if it exceeds the repository's S/M logic budget; large fixed data fixtures do not justify a larger behavioral scope.

## Notes for the reviewer

Check the observable acceptance criteria, exact evidence/units and failure paths. Source support is not linguistic approval; imported drafts cannot self-certify. Confirm no credentials, model call, hidden network fallback, source erasure or fabricated review appears in the app/tooling. Content review in Claude must be an actual separately recorded operation on the exact payload; a code review alone does not imply all Dutch text passed the language rubric.
