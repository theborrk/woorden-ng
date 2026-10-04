---
id: T-115
title: Load the first starter slice into a content inspection view
status: todo
size: M
depends_on: [T-111]
type: task
refs: [W20, F04, F08, T43]
---

## Goal

A contributor can inspect the first ten starter senses with PL/EN meanings, examples, source facts and review status.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; `docs/adr/0005-source-and-ai-content-review.md` (accepted).
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.
- Research data, packets, schemas and Python prototypes: `research/content-2026-10/` (see its `README.md`).

## Scope

In:

- Import S01–S10 as explicitly unreviewed drafts using issued registry IDs.
- Expose a minimal content inspection route or existing review view with field provenance and missing-data notices.

Out (do not do in this task):

- Curated publication, learner progress migration or a new study engine.

## Acceptance criteria

- [ ] AC1: Given S01–S10, when opened in the inspection view, then all locales/examples/source states are visible and no unreviewed badge implies approval. (e2e)
- [ ] AC2: Given a missing whole-expression IPA, when rendered, then the UI shows an honest unavailable state without generated phonetics. (e2e)

## Notes for the implementer

Keep this one reviewable PR. Port/reuse the research algorithms in the repository's TypeScript/CLI conventions; the research Python scripts are evidence/prototypes, not a new runtime dependency. Prefix tests with relevant blueprint IDs. Run the repository's required verification gates for changed behavior; never record an unexecuted gate as passed. Preserve source text, IDs and review provenance. Do not edit protected agent/workflow files or introduce legacy progress migration. Stop to split implementation if it exceeds the repository's S/M logic budget; large fixed data fixtures do not justify a larger behavioral scope.

## Notes for the reviewer

Check the observable acceptance criteria, exact evidence/units and failure paths. Source support is not linguistic approval; imported drafts cannot self-certify. Confirm no credentials, model call, hidden network fallback, source erasure or fabricated review appears in the app/tooling. A language check is an actual, recorded sample check of a generation batch (ADR 0005); a code review alone does not check the Dutch.
