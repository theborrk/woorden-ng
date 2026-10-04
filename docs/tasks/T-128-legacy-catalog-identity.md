---
id: T-128
title: Browse the normalized legacy catalog with durable sense identity
status: todo
size: M
depends_on: [T-109, T-110, T-126]
type: task
refs: [W05, W07, T32, I08, F06]
---

## Goal

A learner can browse every preserved legacy source row, see its original Russian text and proposed
sense annotations, and keep new-app history attached to the same identity after catalog edits.

## Context

- Blueprint §§7.1, 14, W05/W07 and T32; ADRs 0003 and 0005.
- Reuse T-001's seed, T-109's audit/ID registry and reversible annotations, and T-110's entry schema.
- Content backlog T-111–T-120 owns draft import, review, pilot inspection, compiler and publication.

## Scope

In:

- Extend the existing registry with once-issued opaque legacy lexeme/sense/form IDs where absent;
  preserve every already-issued ID. Compile normalized records using T-110 rather than another schema.
- Account for all 1,946 s0–s1945 rows with verbatim RU/EN and provenance-only positional links.
  Sense scaffolds retain missing/unknown review states; audit drops remain aliases/tombstones.
- A legacy Library view and catalog query port showing originals, annotations and provisional status.
  Retained content revisions/redirects keep new-app event references interpretable.
- Explicit split/merge records for catalog identity; no automatic duplication of mastery into new senses.

Out (do not do in this task):

- Re-extracting/auditing the seed, a competing registry, reviewer evidence or curated pack compiler.
- Old-app learner data, automatic language approval, rewritten Russian originals or full content editing UI.

## Acceptance criteria

- [ ] AC1: Given T-109 audit output and the existing registry, when normalization is rerun or rows
      reorder, then all 1,946 provenance rows remain accounted for and issued IDs/RU text are unchanged (integration).
- [ ] AC2: Given new-app event fixtures referencing a sense, when spelling/order/pack revision changes,
      then history resolves to the same identity and retained prompt revision, not a positional ID (unit and integration).
- [ ] AC3: Given alias, retirement or meaning-split annotations, when resolved, then original rows
      remain inspectable and a new sense receives no copied measured mastery (unit).
- [ ] AC4: Given a legacy entry missing PL or independent review, when opened in Library, then original
      RU/EN, annotations and missing/provisional status are visible without an approval claim (e2e).

## Notes for the implementer

Native work: no. Primary files: `tools/content/normalize-legacy.ts`, `content/source/legacy/`,
the registry established by T-109/T-110, `src/application/catalog/`, `src/features/library/legacy/`.
Do not maintain a second research/production allocation registry. Wire the pure catalog reader on both
targets without native plugin work. Schema adaptation is W05's remaining content work; T-110 owns validation.

## Notes for the reviewer

T32 tests use new-app history fixtures only. No reads of old woorden.* storage or v1 backups are
allowed. ADR 0005 status axes apply even when structural validation succeeds.
