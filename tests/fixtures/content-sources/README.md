# NT2Lex excerpt

`nt2lex-excerpt.tsv` is the unchanged header and first two complete data rows (including their
newlines) from `research/content-2026-10/evidence/sources/nt2lex-basic.tsv`. Its acquisition URL,
retrieval time and full-file hash come from the adjacent research manifest. This is a complete
small fixture, not a claim to contain the complete corpus. `records.json` pins each original
line's SHA-256 and 1-based source locator. The manifest hashes only the excerpt, with the bulk
snapshot identified in its lineage. No record is marked reviewed or approved.

## T-101 basic and sense-linked fixtures

`nt2lex-basic.tsv` and `nt2lex-senses.tsv` contain the original header, first three data rows and
all `bank` rows from the pinned downloads. They retain exact source bytes and record hashes,
including newlines. Adjacent `*.manifest.json` pins the small excerpt with T-100's schema and
identifies the full snapshot hash in lineage. `*.records.json` maps each physical excerpt line
to its original full-file line and SHA-256. Import provenance uses physical lines of the
inspected input; consult this mapping for original full-file locations. This covers repeated
lemmas with different POS, multiple candidate lexical entries, missing bands/IDs and numeric
zero. Tests read only these small committed files and never download.
