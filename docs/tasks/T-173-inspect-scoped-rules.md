---
id: T-173
title: Inspect scoped article and morphology explanations
status: todo
size: M
depends_on: [T-110]
type: task
refs: [W20, W22, F02, F08, T12]
---

## Goal

A contributor can inspect one sourced EN/PL rule and its supported examples and exceptions.

## Context

- Blueprint §§7, 10, 14–15, 22.3, W18–W25; `docs/architecture/README.md`.
- ADR 0003 and ADR 0005 (sample-check policy supersedes human-review wording).
- T-012 handoff; reuse T-100–T-122 and T-168–T-171 rather than duplicating their tooling.

## Scope

In:

- Resolve rule/form/sense IDs and explicit source observations; expose construction scope, exceptions, strong/weak/irregular distinctions and de/het alternatives. Missing explanations are blockers, not inferred suffix rules.

Out (do not do in this task):

- Native plugins/permissions, recording, runtime downloads/updates (M9), or unrelated UI redesign.
- New generators, automatic linguistic approval or competing identity/eligibility contracts.

## Acceptance criteria

- [ ] AC1: Given a sourced construction and exception fixture, when inspected, then EN/PL explanations, scope and exceptions survive round-trip (integration).
- [ ] AC2: Given a noun with valid alternative articles or an inflected verb, when inspected, then accepted forms link to explicit records and lexical/article outcomes stay separate (unit).
- [ ] AC3: Given absent evidence or a suffix guess, when validated, then source verification is refused (unit).

## Notes for the implementer

Native work: no. Primary files: `tools/content/rules/`, `tests/integration/m5-m6/t-173/`.
Reuse established schemas, IDs, ports and command transactions. No runtime AI, paid service,
remote ASR, legacy progress migration or fabricated review. Synthetic test fixtures never authorize
production content. Shared UI uses EN/PL resources and screenshot-backed e2e flows.
Run the inspector directly with Node; leave package manifests and shared barrels untouched.

## Notes for the reviewer

Check exact hash-bound evidence, failures and task/cue identity. Stay within one S/M slice;
external language/visual/phone QA requires recorded real results, never simulated success.
