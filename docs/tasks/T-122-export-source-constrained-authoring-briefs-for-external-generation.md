---
id: T-122
title: Export source-constrained authoring briefs for external generation
status: todo
size: S
depends_on: [T-103, T-104, T-108, T-168]
type: task
refs: [W19, W20, F04, F08, T50]
---

## Goal

A contributor can prepare a bounded Model A prompt containing the exact source facts, intended situation, prerequisites and required output contract.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; `docs/adr/0005-source-and-ai-content-review.md` (accepted).
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.
- Research data, packets, schemas and Python prototypes: `research/content-2026-10/` (see its `README.md`).

## Scope

In:

- Export a small source-backed authoring brief and the copy-ready author-A prompt, with immutable input hashes.
- Include missing/conflicted factual fields, direct PL/EN translation requirements and examples/answer-span constraints.
- Include the exercise rules R1–R5 (ADR 0005) and T-168's validator findings, so drafts arrive rule-compliant.

Out (do not do in this task):

- Calling a provider, generating grammar facts from memory, or adding content:generate to the application.

## Acceptance criteria

- [ ] AC1: Given five selected senses, when briefs are exported, then every asserted dictionary fact points to supplied evidence and unknown fields remain explicit. (unit)
- [ ] AC2: Given a model return file, when passed to the existing draft importer, then it follows the unapproved draft path and cannot import its own approval. (integration)

## Notes for the implementer

Keep this one reviewable PR. Port/reuse the research algorithms in the repository's TypeScript/CLI conventions; the research Python scripts are evidence/prototypes, not a new runtime dependency. Prefix tests with relevant blueprint IDs. Run the repository's required verification gates for changed behavior; never record an unexecuted gate as passed. Preserve source text, IDs and review provenance. Do not edit protected agent/workflow files or introduce legacy progress migration. Stop to split implementation if it exceeds the repository's S/M logic budget; large fixed data fixtures do not justify a larger behavioral scope.

## Notes for the reviewer

Check the observable acceptance criteria, exact evidence/units and failure paths. Source support is not linguistic approval; imported drafts cannot self-certify. Confirm no credentials, model call, hidden network fallback, source erasure or fabricated review appears in the app/tooling. A language check is an actual, recorded sample check of a generation batch (ADR 0005); a code review alone does not check the Dutch.
