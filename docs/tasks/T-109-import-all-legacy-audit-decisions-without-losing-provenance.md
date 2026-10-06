---
id: T-109
title: Import all legacy audit decisions without losing provenance
status: done
size: M
depends_on: [T-103, T-104, T-106]
type: task
refs: [W18, W20, F04, F08]
---

## Goal

A contributor can inspect one decision for every legacy entry and apply a reviewed annotation while preserving original text and identity.

## Context

- Architecture: `docs/architecture/README.md`; blueprint §§7.1, 10, 14, 22 and the refs above.
- Research: `docs/content/research-report.md`, `docs/content/entry-specification.md`, `docs/content/verification-pipeline.md`.
- Related decisions: `docs/adr/0003-woorden-scope-and-adaptation.md`; `docs/adr/0005-source-and-ai-content-review.md` (accepted).
- Existing T-001 is done (repository inspected 2026-10-03); reuse its immutable seed and tooling conventions.
- Research data, packets, schemas and Python prototypes: `research/content-2026-10/` (see its `README.md`).

## Scope

In:

- Import `research/content-2026-10/content/legacy-audit.csv` plus `legacy-audit-evidence.json`; preserve s0–s1945 and original RU/EN.
- Represent keep/fix/opt-in/drop-as-alias separately from review readiness and show proposed changes.
- Add coverage totals and a reversible annotation-only application path.

Out (do not do in this task):

- Old-app progress/settings/backup migration, erasing dropped rows, or auto-approving the research audit.

## Acceptance criteria

- [x] AC1: Given the seed and CSV, when imported, then every one of 1,946 unique IDs is accounted for once and original RU is byte-equivalent as text. (integration)
- [x] AC2: Given s295 het eten, when proposed changes are shown, then noun/verb contamination is visible without modifying the immutable source. (unit)
- [x] AC3: Given s1392 deksel and s800 soort, when article candidates differ, then valid alternatives are not classified as unconditional errors. (unit)

## Notes for the implementer

Keep this one reviewable PR. Port/reuse the research algorithms in the repository's TypeScript/CLI conventions; the research Python scripts are evidence/prototypes, not a new runtime dependency. Prefix tests with relevant blueprint IDs. Run the repository's required verification gates for changed behavior; never record an unexecuted gate as passed. Preserve source text, IDs and review provenance. Do not edit protected agent/workflow files or introduce legacy progress migration. Stop to split implementation if it exceeds the repository's S/M logic budget; large fixed data fixtures do not justify a larger behavioral scope.

## Notes for the reviewer

Check the observable acceptance criteria, exact evidence/units and failure paths. Source support is not linguistic approval; imported drafts cannot self-certify. Confirm no credentials, model call, hidden network fallback, source erasure or fabricated review appears in the app/tooling. A language check is an actual, recorded sample check of a generation batch (ADR 0005); a code review alone does not check the Dutch.
