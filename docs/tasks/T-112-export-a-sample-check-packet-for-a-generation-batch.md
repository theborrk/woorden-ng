---
id: T-112
title: Export a sample-check packet for a generation batch
status: todo
size: S
depends_on: [T-111]
type: task
refs: [W19, F08, T50]
---

## Goal

A contributor can turn a generation batch into one compact sample-check packet for a different-vendor model, reproducibly.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; `docs/adr/0005-source-and-ai-content-review.md` (accepted).
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.
- Research data, packets, schemas and Python prototypes: `research/content-2026-10/` (see its `README.md`).

## Scope

In:

- A `content:sample` command: given a batch manifest (entry IDs and hashes) and a seed, select the sample of ADR 0005 section 3 (whole batch at 20 entries or fewer; otherwise 10 seeded random entries plus up to 10 risk entries, with the risk category of each).
- Write the packet: the sampled entries without author verdicts or self-checks, only the source facts each entry asserts (not whole source records), the five exercise rules, the three questions and the response format; plus the batch manifest with every entry hash.
- A JSON Schema for the sample-check response (batch ID, reviewer vendor and run reference, seed, one verdict per sampled entry: `pass`, `fix` with JSON Patch operations, or `unsure` with a reason).

Out (do not do in this task):

- Invoking a provider, fabricating a response or requiring a Dutch-speaking human.
- Importing responses or changing statuses (T-113).

## Acceptance criteria

- [ ] AC1: Given the same batch and seed, when exported twice, then the sample and the packet bytes are identical; a different seed changes only the random part. (unit)
- [ ] AC2: Given a batch of 20 entries or fewer, when exported, then every entry is sampled; given a larger batch, then 10 random entries and at most 10 risk entries are sampled and each risk entry names its category. (unit)
- [ ] AC3: Given the 60-entry pilot, when exported, then the packet contains no author verdict or self-check field and is at most a tenth of the size of the six research packets together. (integration)

## Notes for the implementer

Keep this one reviewable PR. Port/reuse the research algorithms in the repository's TypeScript/CLI conventions; the research Python scripts are evidence/prototypes, not a new runtime dependency. Prefix tests with relevant blueprint IDs. Run the repository's required verification gates for changed behavior; never record an unexecuted gate as passed. Preserve source text, IDs and review provenance. Do not edit protected agent/workflow files or introduce legacy progress migration. Stop to split implementation if it exceeds the repository's S/M logic budget; large fixed data fixtures do not justify a larger behavioral scope.

## Notes for the reviewer

Check the observable acceptance criteria, exact evidence/units and failure paths. Source support is not linguistic approval; imported drafts cannot self-certify. Confirm no credentials, model call, hidden network fallback, source erasure or fabricated review appears in the app/tooling. A language check is an actual, recorded sample check of a generation batch (ADR 0005); a code review alone does not check the Dutch.
