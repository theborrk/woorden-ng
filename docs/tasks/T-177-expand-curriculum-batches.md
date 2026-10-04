---
id: T-177
title: Prepare resumable curriculum batches beyond the pilot
status: todo
size: M
depends_on: [T-122, T-117]
type: task
refs: [W19, W20, F04, F08, T50]
---

## Goal

A contributor can prepare the next bounded theme batch without calling a generator or losing coverage.

## Context

- Blueprint §§7, 10, 14–15, 22.3, W18–W25; `docs/architecture/README.md`.
- ADR 0003 and ADR 0005 (sample-check policy supersedes human-review wording).
- T-012 handoff; reuse T-100–T-122 and T-168–T-171 rather than duplicating their tooling.

## Scope

In:

- Deterministic source-constrained batch selection/checkpoints for everyday/work/travel/shopping/housing/health; farming/slang are explicit opt-in. Reuse ranking, briefs, imports, sample packets and compiler, expose remaining target senses honestly.

Out (do not do in this task):

- Native plugins/permissions, recording, runtime downloads/updates (M9), or unrelated UI redesign.
- New generators, automatic linguistic approval or competing identity/eligibility contracts.

## Acceptance criteria

- [ ] AC1: Given a target manifest and saved cursor, when preparation resumes, then disjoint bounded batches retain IDs and provenance without duplicate entries (integration).
- [ ] AC2: Given source candidates without verified senses, when coverage is shown, then candidate counts are not presented as reviewed sense coverage (unit).
- [ ] AC3: Given unreviewed output or optional farming/slang themes, when exported, then status stays draft and optional packs stay opt-in (integration).

## Notes for the implementer

Native work: no. Primary files: `tools/content/curriculum-batches/`, `tests/integration/m5-m6/t-177/`.
Reuse established schemas, IDs, ports and command transactions. No runtime AI, paid service,
remote ASR, legacy progress migration or fabricated review. Synthetic test fixtures never authorize
production content. Shared UI uses EN/PL resources and screenshot-backed e2e flows.

## Notes for the reviewer

Check exact hash-bound evidence, failures and task/cue identity. Stay within one S/M slice;
external language/visual/phone QA requires recorded real results, never simulated success.
