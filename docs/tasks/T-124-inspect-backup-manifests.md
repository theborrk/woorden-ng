---
id: T-124
title: Inspect v2 backup manifests and portable inventories
status: done
size: S
depends_on: []
type: task
refs: [W05, W09, I12, I22]
---

## Goal

A contributor can inspect a proposed portable backup inventory and see its compatibility and media
requirements before an archive is written or imported.

## Context

- Blueprint §§17.2, 17.4, 18.4 and W05/W09; ADRs 0002 and 0003.
- Existing PWA/native installations are separate; a logical backup is their explicit transfer path.

## Scope

In:

- A versioned `.woorden.zip` manifest/inventory schema: app/logical/schema versions, export instant,
  profile IDs, pack revisions, event watermark, file names, sizes, checksums and media inclusion policy.
- Portable settings allowlist excluding installation identity, physical paths, connections, platform
  permissions and notification OS IDs. Historical event device IDs remain portable history.
- A deterministic manifest inspector and full/progress-only examples with explicit omitted-media warnings.

Out (do not do in this task):

- ZIP libraries/compression, event/body validation, file access, export/restore or native plugins.
- Old-app v1 backups, legacySnapshots or migration of old settings/progress/custom words.

## Acceptance criteria

- [x] AC1: Given full and progress-only inventories, when inspected, then their version, watermark,
      retained content revisions and required/omitted media are reported deterministically (unit and integration).
- [x] AC2: Given unsupported versions, duplicate/unsafe paths, bad hashes or inconsistent media
      inclusion, when inspected, then validation rejects the inventory with a field-specific error (unit).
- [x] AC3: Given destination-local identity/permission/notification fields in portable settings,
      when validated, then they are rejected while historical device references remain valid (unit).

## Notes for the implementer

Native work: no. Primary files: `src/contracts/backup/`, `tools/contracts/inspect-backup.ts`,
`tests/fixtures/backup-manifests/`. Use existing tooling, run directly with Node and do not edit package
manifests or shared barrel files. T-123/T-125 own separate contracts and can run in parallel.

## Notes for the reviewer

Do not confuse a valid manifest with a verified archive. Expanded-size and archive-content checks
belong to T-136; this slice makes the inventory contract inspectable.
