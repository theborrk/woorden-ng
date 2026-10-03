---
id: T-112
title: Export resumable source-linked reviewer packets
status: todo
size: S
depends_on: [T-105, T-111]
type: task
refs: [W19, F08, T50]
---

## Goal

A contributor can hand a bounded review packet to Claude and resume from the next incomplete batch.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; `docs/adr/0005-source-and-ai-content-review.md` (accepted).
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.
- Research data, packets, schemas and Python prototypes: `research/content-2026-10/` (see its `README.md`).

## Scope

In:

- Export ten-entry packets with source observations, current content hashes and the fixed rubric.
- Track batches and required dimensions without copying the author confidence verdict into reviewer instructions.

Out (do not do in this task):

- Invoking a provider, fabricating a reviewer response or requiring a Dutch-speaking human.

## Acceptance criteria

- [ ] AC1: Given 60 imported drafts, when exported, then six packets account for all entry hashes once. (integration)
- [ ] AC2: Given an incomplete prior review, when exporting again, then completed unchanged entries are distinguishable and outstanding work is resumable. (unit)

## Notes for the implementer

Keep this one reviewable PR. Port/reuse the research algorithms in the repository's TypeScript/CLI conventions; the research Python scripts are evidence/prototypes, not a new runtime dependency. Prefix tests with relevant blueprint IDs. Run the repository's required verification gates for changed behavior; never record an unexecuted gate as passed. Preserve source text, IDs and review provenance. Do not edit protected agent/workflow files or introduce legacy progress migration. Stop to split implementation if it exceeds the repository's S/M logic budget; large fixed data fixtures do not justify a larger behavioral scope.

## Notes for the reviewer

Check the observable acceptance criteria, exact evidence/units and failure paths. Source support is not linguistic approval; imported drafts cannot self-certify. Confirm no credentials, model call, hidden network fallback, source erasure or fabricated review appears in the app/tooling. Content review in Claude must be an actual separately recorded operation on the exact payload; a code review alone does not imply all Dutch text passed the language rubric.
