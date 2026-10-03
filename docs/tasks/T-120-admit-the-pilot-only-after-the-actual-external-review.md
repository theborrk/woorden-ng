---
id: T-120
title: Admit the pilot only after the actual external review
status: todo
size: S
depends_on: [T-113, T-114, T-116]
type: task
refs: [W19, W20, F04, F08, T50]
---

## Goal

The pilot can move from research draft to eligible written tasks after real independent review and source adjudication.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; `docs/adr/0005-source-and-ai-content-review.md` (accepted).
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.
- Research data, packets, schemas and Python prototypes: `research/content-2026-10/` (see its `README.md`).

## Scope

In:

- Import the actual reviewer-B responses from `research/content-2026-10/review/responses/` with the T-113 validation tool.
- Resolve or retain every flagged dimension; update exact reviewed hashes and task-level coverage.

Out (do not do in this task):

- Simulated reviewer responses, blanket status edits or marking all 60 complete when only a subset passes.

## Acceptance criteria

- [ ] AC1: Given missing external artifacts, when admission is attempted, then the task remains blocked and zero fabricated verdicts are recorded. (integration)
- [ ] AC2: Given real passing responses on current hashes, when admitted, then only applicable passing task families become eligible and all unresolved entries remain flagged. (integration)

## Notes for the implementer

Keep this one reviewable PR. Port/reuse the research algorithms in the repository's TypeScript/CLI conventions; the research Python scripts are evidence/prototypes, not a new runtime dependency. Prefix tests with relevant blueprint IDs. Run the repository's required verification gates for changed behavior; never record an unexecuted gate as passed. Preserve source text, IDs and review provenance. Do not edit protected agent/workflow files or introduce legacy progress migration. Stop to split implementation if it exceeds the repository's S/M logic budget; large fixed data fixtures do not justify a larger behavioral scope.

## Notes for the reviewer

Check the observable acceptance criteria, exact evidence/units and failure paths. Source support is not linguistic approval; imported drafts cannot self-certify. Confirm no credentials, model call, hidden network fallback, source erasure or fabricated review appears in the app/tooling. Content review in Claude must be an actual separately recorded operation on the exact payload; a code review alone does not imply all Dutch text passed the language rubric.

Review input: the reviewer-B round is run outside the app, one Claude Code session per batch, following
`research/content-2026-10/review/RUNBOOK.md`. Its responses land in `research/content-2026-10/review/responses/`. If fewer than six
responses exist when this task starts, admit only the reviewed batches and leave the rest blocked.
