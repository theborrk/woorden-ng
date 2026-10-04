---
id: T-118
title: Import and QA one downloadable audio slice
status: todo
size: M
depends_on: [T-100, T-114]
type: task
refs: [W21, F08, T43]
---

## Goal

A contributor can attach and verify a small audio pack and see listening tasks disabled for missing or invalid assets.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; `docs/adr/0005-source-and-ai-content-review.md` (accepted).
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.
- Research data, packets, schemas and Python prototypes: `research/content-2026-10/` (see its `README.md`).

## Scope

In:

- Implement content:media manifest/import for a small approved candidate set with text/voice/region/hash/MIME/duration/attribution metadata.
- Check corrupt files, download status and text-to-asset identity; leave pronunciation QA explicit.

Out (do not do in this task):

- Mass TTS generation, cloud provider integration, remote ASR or claiming pronunciation QA from a checksum.

## Acceptance criteria

- [ ] AC1: Given valid approved audio, when packaged/downloaded, then replay resolves by the expected hash. (integration)
- [ ] AC2: Given a missing/corrupt/wrong-text asset, when eligibility is evaluated, then listening is blocked and eligible written tasks remain usable. (unit)
- [ ] AC3: Given an unlistened source URL, when imported, then it remains candidate-only. (unit)

## Notes for the implementer

Keep this one reviewable PR. Port/reuse the research algorithms in the repository's TypeScript/CLI conventions; the research Python scripts are evidence/prototypes, not a new runtime dependency. Prefix tests with relevant blueprint IDs. Run the repository's required verification gates for changed behavior; never record an unexecuted gate as passed. Preserve source text, IDs and review provenance. Do not edit protected agent/workflow files or introduce legacy progress migration. Stop to split implementation if it exceeds the repository's S/M logic budget; large fixed data fixtures do not justify a larger behavioral scope.

## Notes for the reviewer

Check the observable acceptance criteria, exact evidence/units and failure paths. Source support is not linguistic approval; imported drafts cannot self-certify. Confirm no credentials, model call, hidden network fallback, source erasure or fabricated review appears in the app/tooling. A language check is an actual, recorded sample check of a generation batch (ADR 0005); a code review alone does not check the Dutch.
