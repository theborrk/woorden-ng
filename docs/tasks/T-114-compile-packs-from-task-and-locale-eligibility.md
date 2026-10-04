---
id: T-114
title: Compile packs from task and locale eligibility
status: todo
size: M
depends_on: [T-113]
type: task
refs: [W18, F08, T43, T50]
---

## Goal

A contributor can compile a versioned pack containing only tasks whose required data and language checks are current.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; `docs/adr/0005-source-and-ai-content-review.md` (accepted).
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.
- Research data, packets, schemas and Python prototypes: `research/content-2026-10/` (see its `README.md`).

## Scope

In:

- Implement a pure eligibility function and a small pack compiler with manifest hashes.
- Separate written, article, form, cloze, picture and listening gates and preserve flagged/draft records outside the curated pack.

Out (do not do in this task):

- UI redesign, new scheduling policies or mandatory media for every sense.

## Acceptance criteria

- [ ] AC1: Given a batch_checked written entry with absent audio, when compiled, then written tasks can appear and listening tasks cannot. (unit)
- [ ] AC2: Given no sample check, when the delivered 60-entry pilot is compiled, then curated output contains zero eligible entries and a concrete blocker report. (integration)
- [ ] AC3: Given content changed after its batch passed, when compiled, then the stale check cannot authorize the new payload, and a flagged or uncertain entry stays out. (unit)

## Notes for the implementer

Keep this one reviewable PR. Port/reuse the research algorithms in the repository's TypeScript/CLI conventions; the research Python scripts are evidence/prototypes, not a new runtime dependency. Prefix tests with relevant blueprint IDs. Run the repository's required verification gates for changed behavior; never record an unexecuted gate as passed. Preserve source text, IDs and review provenance. Do not edit protected agent/workflow files or introduce legacy progress migration. Stop to split implementation if it exceeds the repository's S/M logic budget; large fixed data fixtures do not justify a larger behavioral scope.

## Notes for the reviewer

Check the observable acceptance criteria, exact evidence/units and failure paths. Source support is not linguistic approval; imported drafts cannot self-certify. Confirm no credentials, model call, hidden network fallback, source erasure or fabricated review appears in the app/tooling. A language check is an actual, recorded sample check of a generation batch (ADR 0005); a code review alone does not check the Dutch.
