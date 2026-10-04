---
id: T-221
title: Install web content packs through verified staging
status: todo
size: M
depends_on: [T-220, T-179]
type: task
refs: [W32, T40, I21, F11]
---

## Goal

A PWA learner can install a reviewed content pack and keep the previous pack usable if the download fails.

## Context

- Blueprint §§18.1, 21; consume T-114 compiled packs and T-220 capability presentation.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Offer size/version/locale preview, progress and cancel. Fetch only trusted configured origins; reject unsupported versions, executable JavaScript/HTML/SVG and traversal paths. Stage assets by hash, verify required checksums, then switch the manifest pointer in one Dexie transaction; recover and clean unreferenced staging on restart while retaining historical prompt revisions.

Out (do not do in this task):

- Native files, app-code delivery, audio-specific download controls or new content compilation.

## Acceptance criteria

- [ ] AC1: Given a valid compatible reviewed pack, when installation completes, then all required hashes are verified before atomic activation and offline content browsing works (integration and e2e).
- [ ] AC2: Given an interrupted, canceled or checksum-invalid install, when the app restarts, then the previous active pack and history remain usable and orphan cleanup is recoverable (integration and e2e).
- [ ] AC3: Given an untrusted origin, newer schema or executable/path-traversal payload, when installation is requested, then validation blocks activation without executing content or mutating live data (unit and e2e).

## Notes for the implementer

Native work: no. Primary files: `src/application/packs/web/`, `src/features/packs/install/`, `e2e/web-pack-install.spec.ts`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
