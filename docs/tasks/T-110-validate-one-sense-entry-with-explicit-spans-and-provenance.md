---
id: T-110
title: Validate one sense entry with explicit spans and provenance
status: done
size: M
depends_on: []
type: task
refs: [W18, W20, F08, T43, T50]
---

## Goal

A contributor can validate a sense entry and see which task families lack the required data.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; `docs/adr/0005-source-and-ai-content-review.md` (accepted).
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.
- Research data, packets, schemas and Python prototypes: `research/content-2026-10/` (see its `README.md`).

## Scope

In:

- Adopt the exchange contract as a repository schema with immutable registry IDs and JSON-pointer provenance.
- Add semantic checks for sense/form links, EN/PL presence, NFC/UTF-16 spans and source-status scope.

Out (do not do in this task):

- Runtime AI, learner scoring changes or marking the research fixture approved.

## Acceptance criteria

- [x] AC1: Given a discontinuous separable example, when validated, then ordered segments round-trip exactly and point to the intended form/sense. (unit)
- [x] AC2: Given an invented source_verified fact without evidence, when imported, then validation rejects the assertion. (unit)
- [x] AC3: Given missing PL/example/audio, when eligibility is inspected, then only dependent task families are blocked and no content is fabricated. (unit)

## Notes for the implementer

Keep this one reviewable PR. Port/reuse the research algorithms in the repository's TypeScript/CLI conventions; the research Python scripts are evidence/prototypes, not a new runtime dependency. Prefix tests with relevant blueprint IDs. Run the repository's required verification gates for changed behavior; never record an unexecuted gate as passed. Preserve source text, IDs and review provenance. Do not edit protected agent/workflow files or introduce legacy progress migration. Stop to split implementation if it exceeds the repository's S/M logic budget; large fixed data fixtures do not justify a larger behavioral scope.

## Notes for the reviewer

Check the observable acceptance criteria, exact evidence/units and failure paths. Source support is not linguistic approval; imported drafts cannot self-certify. Confirm no credentials, model call, hidden network fallback, source erasure or fabricated review appears in the app/tooling. Content review in Claude must be an actual separately recorded operation on the exact payload; a code review alone does not imply all Dutch text passed the language rubric.

## Implementation evidence

- AC1: `tools/content/validate-entry.test.mjs`, `F08: AC1 discontinuous separable segments round-trip and link to the intended sense/form`; mutations reject bad ordering, offsets, targets and selectors.
- AC2: the same file, `T50: AC2 importing an invented source_verified fact rejects missing, stale or wrong scoped evidence`.
- AC3: the same file, `T43: AC3 missing PL/example/audio blocks only dependent families without fabricating content`, plus locale-specific example coverage.
- Executed gates: `npm run verify` (217 tests) and `npm run test:e2e:web` (11 tests, matching Chromium 153 npm fallback). Research content remains unchanged and unreviewed.
