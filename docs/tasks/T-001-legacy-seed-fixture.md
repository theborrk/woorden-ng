---
id: T-001
title: Extract the original seed into a verified content fixture
status: todo
size: M
depends_on: []
type: task
refs: [W01, F08]
---

## Goal

The 1,946 words of the original app exist as a versioned JSON fixture, extracted reproducibly from
`legacy/index.html` and checked against the blueprint's baseline counts, so all later content work
starts from verified data.

## Context

- Blueprint: section 3 (baseline facts), section 6 (`content/legacy/`, `tools/content/`), section
  14.1, W01 in section 24 (M0)
- Scope change: `docs/adr/0003-woorden-scope-and-adaptation.md` (no progress or backup-file
  migration; the seed is still carried over)
- Source: `legacy/index.html` (read-only). The `SEED` array literal starts at `const SEED = [`; each
  entry is `[nl, article, ru, en, pos, example, conjugation?, theme?]`, and `loadDeck()` gives
  entry _i_ the ID `s<i>`.

## Scope

In:

- `tools/content/extract-legacy-seed.ts` (or `.mjs`): reads `legacy/index.html`, extracts the `SEED`
  literal, evaluates it in an isolated `node:vm` context (no globals; never `eval` in the main
  context) and writes `content/legacy/seed-v1.json`.
- The fixture: `{ formatVersion, source: { path, sha256, baselineCommit }, entries: [...] }`; each
  entry has `legacyId` (`s0`…) and the original values under readable names, unchanged (Russian
  text and `null`s included).
- A `content:validate` npm script that re-extracts in memory and fails with a readable message when
  the committed fixture is out of date or the source hash changed. CI's `verify` runs it as soon as
  it exists.
- `docs/content/legacy-inventory.md`: the original app's features, settings and storage keys, as
  input for later tasks.

Out (do not do in this task):

- New immutable IDs, senses, normalization or translations (W07, W20).
- Anything about the old app's progress, settings, custom words or backup files (ADR 0003).
- Any change under `legacy/`.

## Acceptance criteria

- [ ] AC1: Given `legacy/index.html`, when the extractor runs twice, then both outputs are
      byte-identical to the committed `content/legacy/seed-v1.json` (unit)
- [ ] AC2: The fixture reproduces section 3's counts: 1,946 entries; 35 with theme `slang` and 1,911
      without; 169 with an example; 1,005 with an article, of which 993 outside slang (712 `de`, 281
      `het`); 163 with conjugation data; 191 with theme `agro` (farming) (unit)
- [ ] AC3: Entry _i_ has `legacyId` `s<i>` and exactly the original values: checked on the first,
      the last, a conjugated and a slang entry, and by converting the whole fixture back to the
      source array and comparing (unit)
- [ ] AC4: Given a modified copy of the source (in the test), when validation runs against it, then
      it fails and reports the hash mismatch (unit)
- [ ] AC5: `docs/content/legacy-inventory.md` lists the original features (study, browse, de/het and
      conjugation drills, TTS, themes, settings, export/import, generated husky icon) and storage
      keys, with line references into `legacy/index.html` (review)

## Notes for the implementer

- Field names: `nl`, `article` (`de` | `het` | `null`), `ru`, `en`, `pos` (`zn`, `ww`, `bn`, `bw`,
  `vw`, `ov`), `example` (Dutch sentence or `""`), `conjugation` (`{ vt, vtp, vd, aux }` or `null`),
  `theme` (`sep`, `agro`, `slang` or `null`). Entries have 6, 7 or 8 elements; missing trailing
  elements mean `null`.
- `baselineCommit` is `e66ad1551a91ee31fe354a33a03cbfff4a66030d` (`legacy/LEGACY.md`).
- Keep the tool dependency-free (Node 22 built-ins). Compute the counts in the test from the
  fixture; only the expected numbers are constants.

## Notes for the reviewer

Check that the extractor cannot run code from the HTML outside the sandbox, and that the counting
rules match section 3's wording.
