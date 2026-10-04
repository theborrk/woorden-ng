---
id: T-176
title: Account for all original rows in the review queue
status: todo
size: M
depends_on: [T-128, T-117, T-175]
type: task
refs: [W18, W20, F04, F08, T43, T50]
---

## Goal

A contributor can audit the complete original catalog and export bounded missing-field batches.

## Context

- Blueprint §§7, 10, 14–15, 22.3, W18–W25; `docs/architecture/README.md`.
- ADR 0003 and ADR 0005 (sample-check policy supersedes human-review wording).
- T-012 handoff; reuse T-100–T-122 and T-168–T-171 rather than duplicating their tooling.

## Scope

In:

- Join all 1,946 provenance rows to stable senses, aliases and tombstones; report EN/PL meanings, examples, scoped rules/forms, review axes and disabled tasks. Export small source-constrained batches, preserving RU and every original row.

Out (do not do in this task):

- Native plugins/permissions, recording, runtime downloads/updates (M9), or unrelated UI redesign.
- New generators, automatic linguistic approval or competing identity/eligibility contracts.

## Acceptance criteria

- [ ] AC1: Given the complete seed and audit decisions, when accounting runs, then all 1,946 rows have explicit retained, aliased or retired dispositions and original RU is preserved (integration).
- [ ] AC2: Given missing PL, examples, forms or sample evidence, when reported, then per-locale/task blockers and sampled/total denominators remain distinct (integration).
- [ ] AC3: Given a sense split, when exported and reimported, then existing identities/history survive and new senses inherit no mastery (integration).

## Notes for the implementer

Native work: no. Primary files: `tools/content/catalog-accounting/`, `tests/integration/m5-m6/t-176/`.
Reuse established schemas, IDs, ports and command transactions. No runtime AI, paid service,
remote ASR, legacy progress migration or fabricated review. Synthetic test fixtures never authorize
production content. Shared UI uses EN/PL resources and screenshot-backed e2e flows.

## Notes for the reviewer

Check exact hash-bound evidence, failures and task/cue identity. Stay within one S/M slice;
external language/visual/phone QA requires recorded real results, never simulated success.
