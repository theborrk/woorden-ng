---
id: T-231
title: Manage replaceable web downloads without deleting personal data
status: todo
size: M
depends_on: [T-230, T-222, T-138]
type: task
refs: [W34, T35, T36, T37, F11]
---

## Goal

A PWA learner can inspect storage, remove optional downloads and preserve/export personal data during quota pressure.

## Context

- Blueprint §§18.1–18.2, 21; reuse T-138 verified recovery backups.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Request persistence with actual granted/denied/unsupported result, display quota estimates with limitations, evict only unneeded replaceable hashes and retained-revision constraints. Separate deliberate profile deletion with confirmation/recovery copy from cache clearing; connect quota failure to draft retry/export.

Out (do not do in this task):

- New archive formats, native storage or claims persistence prevents user clearing.

## Acceptance criteria

- [ ] AC1: Given optional downloads and personal history/media, when downloads are cleared, then personal IDs/hashes/drafts and required retained prompt versions survive and backup round trip matches (integration and e2e).
- [ ] AC2: Given denied persistence or quota failure during answer/export, when the operation runs, then actual capability/failure appears, no false saved state occurs and retry/export remains available (integration and e2e).
- [ ] AC3: Given hostile or oversized backup input from the recovery flow, when import is attempted, then existing limits reject it before live mutation (integration and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/features/settings/storage/web/`, `src/platform/web/storage-management/`, `e2e/web-storage-management.spec.ts`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
