---
id: T-179
title: Publish versioned data packs with rollback-safe staging
status: todo
size: M
depends_on: [T-114, T-172]
type: task
refs: [W18, W21, F08, T40, T43, I21]
---

## Goal

A contributor can stage and verify an eligible data pack while retaining the previous usable artifact.

## Context

- Blueprint §§7, 10, 14–15, 22.3, W18–W25; `docs/architecture/README.md`.
- ADR 0003 and ADR 0005 (sample-check policy supersedes human-review wording).
- T-012 handoff; reuse T-100–T-122 and T-168–T-171 rather than duplicating their tooling.

## Scope

In:

- CLI publication of compiler output with schema/version manifest, referenced audio/images, hash/size/license summaries and temporary staging/atomic activation. Reject executable payloads and incompatible schemas; reuse compiler eligibility. Runtime download/install is reserved for M9.

Out (do not do in this task):

- Native plugins/permissions, recording, runtime downloads/updates (M9), or unrelated UI redesign.
- New generators, automatic linguistic approval or competing identity/eligibility contracts.

## Acceptance criteria

- [ ] AC1: Given a valid eligible pack, when staged, then all references resolve by hash and manifest size/license summaries are reproducible (integration).
- [ ] AC2: Given interrupted write, bad checksum or unsupported schema, when publication fails, then the prior active artifact remains byte-identical and usable (integration).
- [ ] AC3: Given script/HTML/executable content, when staged, then it is rejected and cannot replace native app code (unit).

## Notes for the implementer

Native work: no. Primary files: `tools/content/publish-packs/`, `tests/integration/m5-m6/t-179/`.
Reuse established schemas, IDs, ports and command transactions. No runtime AI, paid service,
remote ASR, legacy progress migration or fabricated review. Synthetic test fixtures never authorize
production content. Shared UI uses EN/PL resources and screenshot-backed e2e flows.

## Notes for the reviewer

Check exact hash-bound evidence, failures and task/cue identity. Stay within one S/M slice;
external language/visual/phone QA requires recorded real results, never simulated success.
