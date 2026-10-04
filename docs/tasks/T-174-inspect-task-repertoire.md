---
id: T-174
title: Inspect discontinuous cloze and variant task contracts
status: todo
size: M
depends_on: [T-110]
type: task
refs: [W18, W24, W25, F02, T44, I07]
---

## Goal

A contributor can preview a contextual prompt and its ordered answer assembly before publication.

## Context

- Blueprint §§7, 10, 14–15, 22.3, W18–W25; `docs/architecture/README.md`.
- ADR 0003 and ADR 0005 (sample-check policy supersedes human-review wording).
- T-012 handoff; reuse T-100–T-122 and T-168–T-171 rather than duplicating their tooling.

## Scope

In:

- Render a direct inspector for explicit UTF-16 spans, gaps, answer order and form IDs; identify duplicate compatible variants versus distinct cue families. Reject ambiguous contexts and meaningful tense/ending mismatches.

Out (do not do in this task):

- Native plugins/permissions, recording, runtime downloads/updates (M9), or unrelated UI redesign.
- New generators, automatic linguistic approval or competing identity/eligibility contracts.

## Acceptance criteria

- [ ] AC1: Given a separable-verb example, when previewed and answered, then ordered disjoint spans highlight and assemble the explicit accepted form (unit and integration).
- [ ] AC2: Given overlapping spans, a wrong tense or ambiguous cue, when inspected, then validation blocks grading instead of accepting a cosmetic typo (unit).
- [ ] AC3: Given two examples of one task and a different cue family, when inspected, then examples share task identity while the other family receives no copied mastery (unit).

## Notes for the implementer

Native work: no. Primary files: `tools/content/task-repertoire/`, `tests/integration/m5-m6/t-174/`.
Reuse established schemas, IDs, ports and command transactions. No runtime AI, paid service,
remote ASR, legacy progress migration or fabricated review. Synthetic test fixtures never authorize
production content. Shared UI uses EN/PL resources and screenshot-backed e2e flows.
Run the inspector directly with Node; leave package manifests and shared barrels untouched.

## Notes for the reviewer

Check exact hash-bound evidence, failures and task/cue identity. Stay within one S/M slice;
external language/visual/phone QA requires recorded real results, never simulated success.
