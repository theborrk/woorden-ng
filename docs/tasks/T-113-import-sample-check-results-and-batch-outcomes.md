---
id: T-113
title: Import sample-check results and batch outcomes
status: done
size: M
depends_on: [T-112]
type: task
refs: [W18, W19, F08, T50]
---

## Goal

A contributor can import an actual sample-check response and see the batch outcome and the resulting language-check state of every entry in the batch.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; `docs/adr/0005-source-and-ai-content-review.md` (accepted).
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.
- Research data, packets, schemas and Python prototypes: `research/content-2026-10/` (see its `README.md`).

## Scope

In:

- Validate the response against T-112's schema: reviewer vendor differs from the author vendor recorded in the drafts, every sampled entry is answered once on its current hash, and the seed and batch manifest match the exported packet.
- Compute the outcome of ADR 0005 section 3: failed when one problem type appears in two or more sampled entries, otherwise passed. On a pass: sampled `pass` entries become `ai_reviewed`, unsampled entries `batch_checked`, `fix` entries `revision_requested` with the patch attached, `unsure` entries `uncertain` and flagged. On a failure: no entry gains a check state.
- Store the raw response, its hash and the import result; importing the same response again changes nothing.
- Any later edit of an entry returns its language check to `not_run`.

Out (do not do in this task):

- Applying patches automatically, auto-publishing, or treating vendor strings as cryptographic proof.

## Acceptance criteria

- [x] AC1: Given a response from the author's vendor, for a stale hash, or missing a sampled entry, when imported, then it is rejected with a reason and no state changes. (unit)
- [x] AC2: Given a passing response, when imported, then sampled passes are ai_reviewed, unsampled entries batch_checked, fix entries revision_requested and unsure entries uncertain and flagged; given the same problem in two sampled entries, then the batch fails and no entry gains a check state. (unit)
- [x] AC3: Given an imported batch, when an entry is edited, then only that entry returns to not_run; importing the same response twice is idempotent. (integration)

## Notes for the implementer

Keep this one reviewable PR. Port/reuse the research algorithms in the repository's TypeScript/CLI conventions; the research Python scripts are evidence/prototypes, not a new runtime dependency. Prefix tests with relevant blueprint IDs. Run the repository's required verification gates for changed behavior; never record an unexecuted gate as passed. Preserve source text, IDs and review provenance. Do not edit protected agent/workflow files or introduce legacy progress migration. Stop to split implementation if it exceeds the repository's S/M logic budget; large fixed data fixtures do not justify a larger behavioral scope.

## Notes for the reviewer

Check the observable acceptance criteria, exact evidence/units and failure paths. Source support is not linguistic approval; imported drafts cannot self-certify. Confirm no credentials, model call, hidden network fallback, source erasure or fabricated review appears in the app/tooling. A language check is an actual, recorded sample check of a generation batch (ADR 0005); a code review alone does not check the Dutch.
