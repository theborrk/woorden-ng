---
id: T-136
title: Reject hostile archives and preview validated backup imports
status: todo
size: M
depends_on: [T-134]
type: task
refs: [W09, T36, I12, F10]
---

## Goal

A PWA learner can choose a backup and inspect a bounded validation report without changing live
profiles or trusting an unsupported, corrupted or hostile archive.

## Context

- Blueprint §§17.2/17.4, 21; T-124 inventory and T-123 record validation through T-134.
- ADR 0003 forbids old-app v1 imports; this flow accepts the new logical format only.

## Scope

In:

- Streaming archive reader, manifest/body/media checks and explicit compressed/expanded/per-entry/
  count/ratio limits. Central limits and a user-confirmed bounded large-media path, not unlimited allocation.
- Validate names, types, IDs/references, timestamps, scheduler serialization/parameters, retained
  content, event hashes and media; reject duplicate paths, traversal and executable payloads.
- Web upload picker, progress/cancellation and a read-only preview of profiles/media/compatibility
  with actionable reasons; no activation or merge yet.

Out (do not do in this task):

- Live mutation/restore, native picker, accepting v1 files, executing imported HTML/JS/SVG or bypassing limits.

## Acceptance criteria

- [ ] AC1: Given a valid full/progress-only v2 archive, when selected, then preview reports exact
      profiles/counts/media warnings while live database and active files remain byte-equivalent (integration and e2e).
- [ ] AC2: Given traversal, duplicate paths, zip bombs, oversize entries, invalid JSON or executable
      media, when inspected, then bounded reading rejects before live mutation (unit and integration).
- [ ] AC3: Given bad checksums, dangling IDs, unknown versions/parameters or old-app v1 data, when
      validated, then preview names the incompatibility and offers no activation (integration and e2e).
- [ ] AC4: Given cancellation or legitimate media above the default limit, when inspecting, then
      cancellation releases staging and a large-media retry requires explicit bounded confirmation (integration and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/application/backup/validate/`, `src/platform/web/files/`,
`src/features/settings/backup/import-preview/`, `tests/fixtures/backup-archives/`.
All fixture archives are deterministic and local. Never render archive content with innerHTML.
Keep validated inventory separate from activation authority.

## Notes for the reviewer

Manifest validity alone is insufficient. Check peak-read limits and rejected inputs that would
mutate or allocate dangerously without validation.
