---
id: T-243
title: Account for every original entry and publication state
status: todo
size: M
depends_on: [T-177, T-179, T-128]
type: task
refs: [W38, F13]
---

## Goal

A maintainer can reconcile all original entries and separate software coverage from actual linguistic/media publication status.

## Context

- Blueprint §§14, 27; ADR 0005 replaces human-review policy, T-117 supplies coverage tools.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Produce final deterministic full-catalog accounting linking all s0–s1945 provenance to immutable senses, redirects/rejections and preserved RU text. Report EN/PL, per-task/theme, sampled-batch/source evidence, audio/image license/hash/QA and disabled tasks; drill down missing/provisional fields. Never self-approve drafts or equate second-model checks with human review.

Out (do not do in this task):

- Generating missing content, changing seed identities, fabricating external sample checks or old progress migration.

## Acceptance criteria

- [ ] AC1: Given the full seed registry and compiled content, when accounting runs, then all 1,946 original entries map exactly once with preserved original RU/provenance and deliberate splits/redirects explicit (integration).
- [ ] AC2: Given missing EN/PL/audio/review evidence or a deliberate lost entry, when report validation runs, then the gap fails completeness and per-locale/task publication/disabled counts agree with actual compiler eligibility (integration).

## Notes for the implementer

Native work: no. Primary files: `tools/content/final-accounting/`, `docs/content/full-catalog-report.md`, `tests/content/final-accounting.test.mjs`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
