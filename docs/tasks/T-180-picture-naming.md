---
id: T-180
title: Study reviewed picture naming with accessible alternatives
status: todo
size: M
depends_on: [T-159, T-179]
type: task
refs: [W21, W25, F02, F07, T43, I07]
---

## Goal

A learner can answer a reviewed referent image or choose an accessible text task with its own evidence.

## Context

- Blueprint §§7, 10, 14–15, 22.3, W18–W25; `docs/architecture/README.md`.
- ADR 0003 and ADR 0005 (sample-check policy supersedes human-review wording).
- T-012 handoff; reuse T-100–T-122 and T-168–T-171 rather than duplicating their tooling.

## Scope

In:

- Use only eligible referent media; omit target-bearing captions/filenames/alt labels before response. Offer explicit accessible text variant and record its cue family; mnemonic images remain help.

Out (do not do in this task):

- Native plugins/permissions, recording, runtime downloads/updates (M9), or unrelated UI redesign.
- New generators, automatic linguistic approval or competing identity/eligibility contracts.

## Acceptance criteria

- [ ] AC1: Given an approved image prompt, when answered unaided, then one picture-family grade saves without copying translation mastery (e2e).
- [ ] AC2: Given a screen-reader text alternative, when selected, then its actual cue family is recorded and no image-only success is claimed (e2e).
- [ ] AC3: Given missing image or opened mnemonic, when continued, then supported written study remains available and assistance is recorded (e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/study/picture/`, `tests/integration/m5-m6/t-180/`.
Reuse established schemas, IDs, ports and command transactions. No runtime AI, paid service,
remote ASR, legacy progress migration or fabricated review. Synthetic test fixtures never authorize
production content. Shared UI uses EN/PL resources and screenshot-backed e2e flows.

## Notes for the reviewer

Check exact hash-bound evidence, failures and task/cue identity. Stay within one S/M slice;
external language/visual/phone QA requires recorded real results, never simulated success.
