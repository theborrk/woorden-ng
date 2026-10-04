---
id: T-175
title: Review draft revisions with resumable evidence
status: todo
size: M
depends_on: [T-113]
type: task
refs: [W18, W19, F08, T50]
---

## Goal

A contributor can reopen a draft queue, inspect provenance, edit or reject content and export the next sample-check packet.

## Context

- Blueprint §§7, 10, 14–15, 22.3, W18–W25; `docs/architecture/README.md`.
- ADR 0003 and ADR 0005 (sample-check policy supersedes human-review wording).
- T-012 handoff; reuse T-100–T-122 and T-168–T-171 rather than duplicating their tooling.

## Scope

In:

- Hash-bound revision editor with source/evidence display, local queue cursor, rejection reasons and resumable export using T-112/T-113. Changes invalidate checks; imported drafts never approve themselves. Reuse existing import and review contracts.

Out (do not do in this task):

- Native plugins/permissions, recording, runtime downloads/updates (M9), or unrelated UI redesign.
- New generators, automatic linguistic approval or competing identity/eligibility contracts.

## Acceptance criteria

- [ ] AC1: Given an imported batch, when a queue is reopened, then progress and exact entry hashes persist without duplicate records (integration and e2e).
- [ ] AC2: Given a checked entry edited or rejected, when saved, then the new hash returns to not_run and curated eligibility is blocked (unit and e2e).
- [ ] AC3: Given self-declared approval, when imported and shown, then the queue shows draft status and requires actual different-vendor evidence (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/content-review/`, `tests/integration/m5-m6/t-175/`.
Reuse established schemas, IDs, ports and command transactions. No runtime AI, paid service,
remote ASR, legacy progress migration or fabricated review. Synthetic test fixtures never authorize
production content. Shared UI uses EN/PL resources and screenshot-backed e2e flows.

## Notes for the reviewer

Check exact hash-bound evidence, failures and task/cue identity. Stay within one S/M slice;
external language/visual/phone QA requires recorded real results, never simulated success.
