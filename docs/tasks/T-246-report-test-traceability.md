---
id: T-246
title: Map every requirement to actual implementation and tests
status: todo
size: M
depends_on: [T-239, T-242, T-244, T-245]
type: task
refs: [W40, F13]
---

## Goal

A maintainer can see which requirements have actual passing evidence and which are blocked, deferred or incomplete.

## Context

- Blueprint §§1, 22, 27; use required-refs.json and blueprint-ID-prefixed tests without modifying process policy.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Generate traceability from task refs, implementation locations and test IDs/results; separate local unit/web, CI-native, physical and owner Play evidence. Resolve missing proof within report tooling only, retain explicit unknown/failed gates and intentional ADR exclusions; detect placeholders/skipped tests/production mocks and unproven done tasks.

Out (do not do in this task):

- Automatically marking implementation done, changing protected agent/review files, fixing other feature gaps or treating declared test names as passed execution.

## Acceptance criteria

- [ ] AC1: Given backlog plus actual run artifacts, when traceability generates, then every in-scope F/W/T/I maps to implementation and qualified evidence or an explicit unresolved gap (integration).
- [ ] AC2: Given a missing result, skipped test or mocked production capability, when completion validation runs, then it fails the affected gate and never counts a named test or done task alone as passing evidence (integration).

## Notes for the implementer

Native work: no. Primary files: `tools/reporting/traceability/`, `docs/reports/traceability.md`, `tests/reporting/traceability.test.mjs`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
