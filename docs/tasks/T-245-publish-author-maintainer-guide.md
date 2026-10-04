---
id: T-245
title: Document reproducible authoring build and forward repair
status: todo
size: M
depends_on: [T-243, T-241]
type: task
refs: [W39, F13]
---

## Goal

A maintainer can build, test, prepare eligible content and diagnose recovery from a clean checkout.

## Context

- Blueprint §§23, 27; retain MIT/original-author attribution and reference existing ADRs.
- Task format: `docs/tasks/README.md`; target-specific adapters stay behind injected ports.

## Scope

In:

- Write exact content extraction/import/review/compile/media/diff/coverage commands, constrained entry rules and genuine external sampled-check handoff. Document dual build/native CI workflow, schema/backup/parameter versions, plugin updates, signing/access prerequisites and forward repair; machine-check referenced paths/scripts and run nonsecret clean-checkout smoke commands.

Out (do not do in this task):

- Architecture changes, new runtime services, regenerated media in ordinary CI and live publishing.

## Acceptance criteria

- [ ] AC1: Given a clean locked checkout and documented commands, when build/test/content smoke runs, then commands exist and produce declared artifacts or explicit external prerequisites with attribution intact (integration).
- [ ] AC2: Given a private/generated draft or incompatible migrated schema, when author/recovery examples are validated, then publication evidence remains honest and instructions use forward repair or supported backup without destructive downgrade (integration).

## Notes for the implementer

Native work: no. Primary files: `docs/maintainer-guide/`, `docs/content/author-guide.md`, `tools/docs/validate-guides/`.

## Notes for the reviewer

Require failing-before-change acceptance evidence and actual adapters where platform behavior is claimed. Report out-of-scope findings instead of broadening this slice.
