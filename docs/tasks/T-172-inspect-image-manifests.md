---
id: T-172
title: Inspect image roles, provenance and release blockers
status: todo
size: M
depends_on: [T-110]
type: task
refs: [W21, F08, T43]
---

## Goal

A contributor can validate a referent or mnemonic image and see exactly why it cannot ship.

## Context

- Blueprint §§7, 10, 14–15, 22.3, W18–W25; `docs/architecture/README.md`.
- ADR 0003 and ADR 0005 (sample-check policy supersedes human-review wording).
- T-012 handoff; reuse T-100–T-122 and T-168–T-171 rather than duplicating their tooling.

## Scope

In:

- Validate hash, MIME, bytes, license, origin, EN/PL descriptions and separate referent/mnemonic roles; visual QA records bind to the asset hash. Export an inspectable missing/ambiguous/text-bearing image report.

Out (do not do in this task):

- Native plugins/permissions, recording, runtime downloads/updates (M9), or unrelated UI redesign.
- New generators, automatic linguistic approval or competing identity/eligibility contracts.

## Acceptance criteria

- [ ] AC1: Given a licensed image with a current visual check, when inspected, then its role and hash resolve with attribution and descriptions (integration).
- [ ] AC2: Given missing bytes, stale visual review or ambiguous referent, when validated, then picture eligibility is blocked while written tasks remain supported (unit).
- [ ] AC3: Given generated imagery or descriptions containing the target, when inspected, then provenance is retained and cue leakage is reported without automatic visual approval (unit).

## Notes for the implementer

Native work: no. Primary files: `tools/content/images/`, `tests/integration/m5-m6/t-172/`.
Reuse established schemas, IDs, ports and command transactions. No runtime AI, paid service,
remote ASR, legacy progress migration or fabricated review. Synthetic test fixtures never authorize
production content. Shared UI uses EN/PL resources and screenshot-backed e2e flows.
Run the inspector directly with Node; leave package manifests and shared barrels untouched.

## Notes for the reviewer

Check exact hash-bound evidence, failures and task/cue identity. Stay within one S/M slice;
external language/visual/phone QA requires recorded real results, never simulated success.
