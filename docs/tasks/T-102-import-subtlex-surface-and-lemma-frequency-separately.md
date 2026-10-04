---
id: T-102
title: Import SUBTLEX surface and lemma frequency separately
status: blocked
size: M
depends_on: [T-100]
type: task
refs: [W18, F04, F08]
---

## Goal

A contributor can query Dutch surface counts, CD and a justified lemma/POS frequency without double-counting repeated lemma fields.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; `docs/adr/0005-source-and-ai-content-review.md` (accepted).
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.
- Research data, packets, schemas and Python prototypes: `research/content-2026-10/` (see its `README.md`).

## Scope

In:

- Stream the pinned full and CD≥2 workbooks with typed fields and header validation.
- Expose lookup evidence and unmatched/POS-ambiguous joins in a CLI report.

Out (do not do in this task):

- A new corpus crawler, sense-frequency inference or final curriculum selection.

## Acceptance criteria

- [ ] AC1: Given the pinned workbooks, when loaded, then 437,503 and 150,357 data rows are counted and quoted units are preserved. (unit on a committed excerpt; full-file counts from the import report in the PR)
- [x] AC2: Given inflected rows sharing FREQlemma, when a lemma query runs, then the importer never sums duplicated lemma totals. (unit)
- [x] AC3: Given missing or mismatched dominant lemma/POS, when scoring input is requested, then lemma count is unknown and surface evidence remains separately available. (unit)

## Notes for the implementer

Keep this one reviewable PR. Port/reuse the research algorithms in the repository's TypeScript/CLI conventions; the research Python scripts are evidence/prototypes, not a new runtime dependency. Prefix tests with relevant blueprint IDs. Run the repository's required verification gates for changed behavior; never record an unexecuted gate as passed. Preserve source text, IDs and review provenance. Do not edit protected agent/workflow files or introduce legacy progress migration. Stop to split implementation if it exceeds the repository's S/M logic budget; large fixed data fixtures do not justify a larger behavioral scope.

Source files: the pinned downloads come from hosts outside the Codex environment's default
allowlist (see "Content backlog" in `docs/tasks/README.md`). Unit tests run on small excerpts
committed under `tests/fixtures/content-sources/` (cut from the pinned file, keeping its record
hashes), never on the network. Criteria that count rows in a full file are proven by the import
command's report run against the pinned download: paste that report into the PR body. If the
download is blocked, open the PR as a draft and say so.

## Notes for the reviewer

Check the observable acceptance criteria, exact evidence/units and failure paths. Source support is not linguistic approval; imported drafts cannot self-certify. Confirm no credentials, model call, hidden network fallback, source erasure or fabricated review appears in the app/tooling. Content review in Claude must be an actual separately recorded operation on the exact payload; a code review alone does not imply all Dutch text passed the language rubric.

## Implementation evidence

- `tools/content/import-subtlex.test.mjs` proves repeated-total handling (AC2),
  unknown lemma counts with separate surface evidence (AC3), excerpt parsing, header/type
  validation, row-count failures and report evidence. All tests run offline.
- AC1 remains blocked: both pinned OSF URLs redirect to `files.de-1.osf.io`, denied
  with HTTP 403 by the environment policy. The available preserved research row is
  reconstructed as an XLSX fixture, not a direct workbook cut. No full-file import report
  has been produced. Keep this task open and its PR draft until direct excerpts and the
  required full-file report prove AC1.
