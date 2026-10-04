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

## T-102 SUBTLEX workbook excerpts

`subtlex-excerpt.xlsx` and `subtlex-cd2-excerpt.xlsx` contain the original header and
`pinnen` cells cut directly from the pinned full/CD≥2 workbooks, including the full
workbook's cached Zipf formula result and verbatim dot-delimited POS/count strings.
Their manifests pin the excerpt bytes and name the full snapshot hash in lineage.
`subtlex-excerpt.records.json` maps physical excerpt row 2 to original rows 19813 / 19887
and pins the unchanged canonical field hashes. `subtlex-records.json` is the preserved
research observation; it is a comparison oracle, not the source used to create the XLSX.

To cut these excerpts, verify each full file against `tools/content/pins/subtlex-*.json`,
then select rows 1 and 19813 / 19887 from `xl/worksheets/sheet1.xml`. Copy those XML cell
nodes and the referenced nodes from `xl/sharedStrings.xml`; remap only row coordinates to
1/2 and shared-string indices to a compact table. Repackage with the original workbook,
relationships, content types, styles and theme. Preserve cached formula values without
recalculation. Hash the new archive for its manifest and compare all parsed fields and the
canonical record hash with the existing research observation. The importer hashes raw field
objects with sorted keys and UTF-8 `JSON.stringify`; worksheet location is mapped separately.
Tests need only these small committed files and never download. No review status is granted.
