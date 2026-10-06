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

- [x] AC1: Given no committed sample-check response, when admission runs, then nothing becomes eligible and the blocker names the missing response. (integration)
- [ ] AC2: Given the actual passing response on the current hashes, when admitted, then only applicable task families of batch_checked or ai_reviewed entries become eligible and every revision_requested or uncertain entry stays out with its reason. (integration)

## Notes for the implementer

Keep this one reviewable PR. Port/reuse the research algorithms in the repository's TypeScript/CLI conventions; the research Python scripts are evidence/prototypes, not a new runtime dependency. Prefix tests with relevant blueprint IDs. Run the repository's required verification gates for changed behavior; never record an unexecuted gate as passed. Preserve source text, IDs and review provenance. Do not edit protected agent/workflow files or introduce legacy progress migration. Stop to split implementation if it exceeds the repository's S/M logic budget; large fixed data fixtures do not justify a larger behavioral scope.

## Notes for the reviewer

Check the observable acceptance criteria, exact evidence/units and failure paths. Source support is not linguistic approval; imported drafts cannot self-certify. Confirm no credentials, model call, hidden network fallback, source erasure or fabricated review appears in the app/tooling. A language check is an actual, recorded sample check of a generation batch (ADR 0005); a code review alone does not check the Dutch.

Check input: the sample check is run outside the app, in one Claude Code session, following `research/content-2026-10/review/SAMPLE-CHECK.md`, once T-112 and T-169 are merged.

## Worker blocker report

Checked against main `eb4ffa9` on 4 October 2026. This task remains `todo`;
AC2 is blocked and no starter entry is admitted.

The current batch is `woorden-starter-rules-1`. Its required actual response
`research/content-2026-10/review/sample-checks/woorden-starter-rules-1.json`
is absent. The historical full-review batch 01 response predates this batch and
cannot serve as a response for its manifest/current hashes. This session has no
callable Anthropic content reviewer; an OpenAI self-check is not valid evidence.
Run the external check under `research/content-2026-10/review/SAMPLE-CHECK.md`,
then commit its packet and raw response before completing admission.

`node tools/content/admit-starter.mjs` reproducibly reports the missing response,
zero eligible entries/tasks, and exits nonzero. AC1 is proved against the real
sixty-entry pilot by `tools/content/admit-starter.test.mjs`, including the direct
Node command and the existing compiler's exclusion of all sixty entries. It
does not generate a response, grant a check status, modify content or publish a pack.

A further readiness gap remains: the pilot is a producer artifact, not a
T-111 operator-owned imported state. Importing `content/pilot/batch.json` without
source-attestation bundles fails on `source:` findings. T-169 explicitly preserved
this gap. Completing admission requires the actual pinned records and exact
field/value claims, resolving remaining structural/link findings, and importing
the batch through `content:import-drafts` without downgrading source claims to
force admission. The absence test also proves this importer refusal.

Once the real response, packet, imported state and source evidence are available,
the admission inspector accepts `--response`, `--packet`, `--state`, `--evidence`,
`--pack-id` and `--version`, delegates to T-113/T-114, and reports the precise
per-entry/task/locale decisions. It is read-only; patches and their next fix-batch
checks still need to be performed before AC2 can be claimed. No simulated passing
response was created to test or bypass this blocker.
