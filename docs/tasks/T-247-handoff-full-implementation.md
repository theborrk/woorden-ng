---
id: T-247
title: Deliver a truthful full product implementation report
status: todo
size: M
depends_on: [T-246]
type: task
refs: [W40, W39, F11, F12, F13, F14]
---

## Goal

The owner can assess the full product and remaining external dependencies from one reproducible handoff.

## Context

- Blueprint §27 amended by ADR 0003/0005; M4/starter completion is only a checkpoint.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Generate final implementation report with F01–F14 paths, actual task repertoire, decisions/version changes, migrations, tests/browsers/devices, catalog quality/media coverage, artifacts, exact run/deployment/recovery commands and signing/physical/Play blockers. Check the entire latest backlog, including M5–M8, before using full-completion wording; unresolved work remains visible and completion fails.

Out (do not do in this task):

- Implementing missing features in a report PR, publication authorization, runtime AI/sync/Web Push or fictional language/physical review.

## Acceptance criteria

- [ ] AC1: Given complete qualified traceability and actual build/content evidence, when handoff generates, then all §27 fields and dual-target outputs are present with separate software/publication status (integration).
- [ ] AC2: Given an unfinished required task, absent physical result or missing signing/Play credential, when report validation runs, then full-completion claim is rejected or precisely qualified and independent delivered artifacts remain listed (integration).
- [ ] AC3: Given deferred services and no old-data migration under ADR 0003, when scope audit runs, then runtime AI/providers/connectors/sync/Web Push stay absent and deliberate exclusions are recorded (integration).

## Notes for the implementer

Native work: no. Primary files: `tools/reporting/completion/`, `docs/reports/implementation.md`, `tests/reporting/completion.test.mjs`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
