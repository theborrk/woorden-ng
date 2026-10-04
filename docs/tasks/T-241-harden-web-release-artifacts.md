---
id: T-241
title: Produce reproducible PWA release and recovery artifacts
status: todo
size: M
depends_on: [T-227, T-237]
type: task
refs: [W37, F11, F13]
---

## Goal

A maintainer can validate a reproducible static PWA artifact and preserve its preceding release for forward recovery.

## Context

- Blueprint §§18.3, 23.1–23.5; reuse existing Cloudflare preview/static hosting and configurable base.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Generate source/lockfile/license/toolchain/content/schema/backup/scheduler metadata and artifact hashes. Gate candidates on offline/update/migration tests and save preceding artifact metadata; document exact preview/publish/forward-repair commands. This future task explicitly permits a focused .github/workflows/web-release.yml without agent/review policy edits.

Out (do not do in this task):

- Publishing without owner authorization, origin migration, automatic rollback of migrated DB or Android signing.

## Acceptance criteria

- [ ] AC1: Given the same locked source/content, when two candidate builds are validated, then logical asset hashes/version metadata match and root/subpath built offline/update checks pass (integration and e2e).
- [ ] AC2: Given a failed gate or incompatible prior schema, when release preparation runs, then publication remains gated and recovery uses preserved data/forward repair rather than a destructive downgrade (integration).

## Notes for the implementer

Native work: no. Primary files: `tools/release/web/`, `.github/workflows/web-release.yml`, `docs/release/web.md`, `e2e/web-release.spec.ts`.
The named protected workflow/build files are explicitly authorized for this future task only; agent/review policy and permanent identity remain protected.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
