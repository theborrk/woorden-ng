---
id: T-107
title: Retrieve Tatoeba candidates with direct EN and PL links
status: todo
size: M
depends_on: [T-100]
type: task
refs: [W19, W20, F08]
---

## Goal

A reviewer can inspect a Dutch sentence and the actual direct translation edges before choosing it as an example candidate.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; `docs/adr/0005-source-and-ai-content-review.md` (accepted).
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.
- Research data, packets, schemas and Python prototypes: `research/content-2026-10/` (see its `README.md`).

## Scope

In:

- Import sentence IDs/text and direct graph links; preserve snapshot and edge provenance.
- Export candidate packets with author/revision metadata when available and explicit missing metadata when not.

Out (do not do in this task):

- Transitive translation approval, corpus-wide language certification or live generation.

## Acceptance criteria

- [ ] AC1: Given the pinned export, when direct links are counted, then 2,273 Dutch IDs with both EN and PL edges are reproducible. (unit on a committed excerpt; full-export count from the import report in the PR)
- [ ] AC2: Given NL→EN→PL without NL→PL, when queried, then no direct Polish translation is claimed. (unit)
- [ ] AC3: Given a selected sentence, when exported, then the reviewer sees all chosen IDs, source texts and unreviewed status. (unit)

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
