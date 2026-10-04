---
id: T-120
title: Admit the starter pilot after one sample check
status: todo
size: S
depends_on: [T-113, T-114, T-116, T-169]
type: task
refs: [W19, W20, F04, F08, T50]
---

## Goal

The 60-entry starter pilot moves from research draft to eligible written tasks after it follows the exercise rules and passes one recorded sample check.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; `docs/adr/0005-source-and-ai-content-review.md` (accepted).
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.
- Research data, packets, schemas and Python prototypes: `research/content-2026-10/` (see its `README.md`).

## Scope

In:

- Run the pilot as one generation batch through T-112 (packet) and T-113 (import), using the actual sample-check response committed under `research/content-2026-10/review/sample-checks/`.
- Apply the outcome: patch `fix` entries (a patched entry returns to not_run and is checked in the next fix batch), keep `uncertain` entries flagged, compile with T-114 and report exactly which entries and task families became eligible.

Out (do not do in this task):

- Simulated or self-written responses, blanket status edits, or admitting entries the check did not cover.

## Acceptance criteria

- [ ] AC1: Given no committed sample-check response, when admission runs, then nothing becomes eligible and the blocker names the missing response. (integration)
- [ ] AC2: Given the actual passing response on the current hashes, when admitted, then only applicable task families of batch_checked or ai_reviewed entries become eligible and every revision_requested or uncertain entry stays out with its reason. (integration)

## Notes for the implementer

Keep this one reviewable PR. Port/reuse the research algorithms in the repository's TypeScript/CLI conventions; the research Python scripts are evidence/prototypes, not a new runtime dependency. Prefix tests with relevant blueprint IDs. Run the repository's required verification gates for changed behavior; never record an unexecuted gate as passed. Preserve source text, IDs and review provenance. Do not edit protected agent/workflow files or introduce legacy progress migration. Stop to split implementation if it exceeds the repository's S/M logic budget; large fixed data fixtures do not justify a larger behavioral scope.

## Notes for the reviewer

Check the observable acceptance criteria, exact evidence/units and failure paths. Source support is not linguistic approval; imported drafts cannot self-certify. Confirm no credentials, model call, hidden network fallback, source erasure or fabricated review appears in the app/tooling. A language check is an actual, recorded sample check of a generation batch (ADR 0005); a code review alone does not check the Dutch.

Check input: the sample check is run outside the app, in one Claude Code session, following `research/content-2026-10/review/SAMPLE-CHECK.md`, once T-112 and T-169 are merged.
