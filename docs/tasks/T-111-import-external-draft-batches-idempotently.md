---
id: T-111
title: Import external draft batches idempotently
status: todo
size: M
depends_on: [T-110]
type: task
refs: [W19, W20, F08, T50]
---

## Goal

A contributor can import a saved external model draft twice without duplicate senses or unearned approvals.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; `docs/adr/0005-source-and-ai-content-review.md` (accepted).
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.
- Research data, packets, schemas and Python prototypes: `research/content-2026-10/` (see its `README.md`).

## Scope

In:

- Accept constrained JSON and generation provenance, allocate IDs once and preserve draft origin.
- Return a reviewable change report and store input artifact hashes.

Out (do not do in this task):

- content:generate, provider SDKs, credentials or accepting producer-supplied approval flags.

## Acceptance criteria

- [ ] AC1: Given the same batch twice, when imported, then canonical IDs and counts remain unchanged. (unit)
- [ ] AC2: Given a batch claiming language_reviewed, batch_checked or ai_reviewed without a recorded sample check, when imported, then it stays draft (language check not_run) or is rejected with a reason. (unit)
- [ ] AC3: Given an edited definition, when reimported, then revision/hash changes and affected reviews are invalidated. (unit)

## Notes for the implementer

Keep this one reviewable PR. Port/reuse the research algorithms in the repository's TypeScript/CLI conventions; the research Python scripts are evidence/prototypes, not a new runtime dependency. Prefix tests with relevant blueprint IDs. Run the repository's required verification gates for changed behavior; never record an unexecuted gate as passed. Preserve source text, IDs and review provenance. Do not edit protected agent/workflow files or introduce legacy progress migration. Stop to split implementation if it exceeds the repository's S/M logic budget; large fixed data fixtures do not justify a larger behavioral scope.

## Notes for the reviewer

Check the observable acceptance criteria, exact evidence/units and failure paths. Source support is not linguistic approval; imported drafts cannot self-certify. Confirm no credentials, model call, hidden network fallback, source erasure or fabricated review appears in the app/tooling. A language check is an actual, recorded sample check of a generation batch (ADR 0005); a code review alone does not check the Dutch.
