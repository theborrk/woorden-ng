---
id: T-230
title: Inspect and export redacted local diagnostics
status: todo
size: M
depends_on: [T-123]
type: task
refs: [W34, T37, F11, F13]
---

## Goal

A contributor can inspect technical version/storage health and deliberately export a redacted local report.

## Context

- Blueprint §§17.4, 21, 23.5; reuse runtime contracts and inspection route conventions.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Add a dedicated EN/PL diagnostics view with schema/content/backup/scheduler versions and capability-qualified health observations. Make unsupported measurements explicit, allow deliberate local export and redact answers, personal examples, recordings, file paths and credentials by allowlist.

Out (do not do in this task):

- Uploading logs, native health adapters and changing package manifests; package manifests stay untouched.

## Acceptance criteria

- [ ] AC1: Given synthetic sensitive fields alongside technical observations, when a local report is previewed/exported, then only allowed technical fields appear and no network upload occurs (unit and e2e).
- [ ] AC2: Given unavailable quota or corrupt version metadata, when diagnostics opens, then unknown/error states and retry/export guidance are visible rather than fabricated health (unit and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/inspection/diagnostics/`, `src/application/diagnostics/`, `e2e/local-diagnostics.spec.ts`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
