---
id: T-103
title: Import explicit ODWN article and morphology observations
status: todo
size: M
depends_on: [T-100]
type: task
refs: [W18, W20, F08]
---

## Goal

A contributor can inspect sense-linked articles, plurals, auxiliary and separability observations from ODWN with their original lineage.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; `docs/adr/0005-source-and-ai-content-review.md` (accepted).
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.
- Research data, packets, schemas and Python prototypes: `research/content-2026-10/` (see its `README.md`).

## Scope

In:

- Parse LexicalEntry/Lemma/WordForms/Morphology/MorphoSyntax and sense provenance from the pinned XML.
- Produce conflict reports with source record IDs and XML pointers.

Out (do not do in this task):

- Treating every synset as a curriculum sense or inferring articles from m_f.

## Acceptance criteria

- [ ] AC1: Given huis-n-1, when article evidence is extracted, then explicit het survives the conflicting gender-like metadata with a visible conflict note. (unit)
- [ ] AC2: Given de/het or absent article fields, when normalized, then alternatives or missing state are retained rather than guessed. (unit)
- [ ] AC3: Given RBN/Wiktionary/automatic provenance, when an observation is exported, then lineage is preserved and not counted as independent by project name alone. (unit)

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
