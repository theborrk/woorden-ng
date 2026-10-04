---
id: T-237
title: Run built PWA regression checks on Firefox and WebKit
status: todo
size: M
depends_on: [T-006]
type: task
refs: [W36, F12, F13]
---

## Goal

A maintainer can run the current built-PWA contracts on Chromium, Firefox and WebKit with explicit unsupported capabilities.

## Context

- Blueprint §§18.7, 22.5; package config.playwrightBrowsers is the existing setup/CI browser source.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Add Firefox/WebKit projects and matching config.playwrightBrowsers; retain mobile Chromium and subpath coverage. Adapt capability-specific tests through observable supported/unavailable assertions rather than skips; exercise EN/PL navigation, storage, offline restart and local audio fallback in real builds.

Out (do not do in this task):

- New product features, native SDK, protected CI edits and changing package dependency versions; package manifests may change only config.playwrightBrowsers.

## Acceptance criteria

- [ ] AC1: Given installed matching Chromium/Firefox/WebKit builds, when npm run test:e2e:web executes, then all projects run built-artifact shell/storage/localization contracts with exact browser versions (integration and e2e).
- [ ] AC2: Given offline restart and unavailable audio capability on each browser, when required cases run at root and configured subpath, then verified available behavior or an explicit unsupported state is asserted without skipped tests or false readiness (e2e).

## Notes for the implementer

Native work: no. Primary files: `playwright.config.ts`, `e2e/browser-matrix/`, `package.json`, `docs/testing/browser-matrix.md`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
