# Local source inspection

`content:sources` records original file bytes without downloads or lexical extraction. For an
initial pin, provide JSON metadata with `source_id`, `url`, `retrieved_at`, `format`, `version`
and `lineage`, as in `tests/fixtures/content-sources/metadata.json`:

```sh
npm --silent run content:sources -- inspect tests/fixtures/content-sources/nt2lex-excerpt.tsv --metadata tests/fixtures/content-sources/metadata.json
```

The JSON report adds `schema_version`, `bytes` and `sha256` and follows
`content/schemas/source-manifest.schema.json`. Save the report as the expected manifest and
check later copies with:

```sh
npm --silent run content:sources -- inspect tests/fixtures/content-sources/nt2lex-excerpt.tsv --expected tests/fixtures/content-sources/manifest.json
```

Only a successful inspection prints a manifest. A mismatch exits with status 1 and a diagnostic
on stderr, leaving the input and expected manifest untouched. The command does not save or adopt
files. Avoid redirecting stdout onto an existing pin: shell redirection truncates it before the
command runs. Hashing streams the raw bytes, including compression, encoding and line endings.
Paths and current time do not enter the manifest.

Allocate `source_id` once for a named snapshot; keep it when relocating files. Record the actual
retrieval timestamp with timezone, declared file format and source version (use an explicit
`unknown` if unavailable). `lineage` lists upstream source families/snapshots, including inherited
corpora; an empty array states that no upstream lineage is known. These are contributor-supplied
provenance, not inferred factual or linguistic approval. The initial inspection measures bytes;
it cannot establish completeness without a trusted expected pin. Format-specific parsing,
decompression and row validation belong to the later importers.

## NT2Lex source exposure (T-101)

Download the two snapshots to ignored `.cache/content-sources/`; their expected manifests in
`tools/content/sources/` use T-100's schema and the research acquisition timestamps/checksums.
The importer never downloads and requires both local files:

```sh
npm --silent run content:nt2lex -- --basic .cache/content-sources/nt2lex-basic.tsv --senses .cache/content-sources/nt2lex-senses.tsv
```

The JSON report accounts for every row by its unchanged CGN POS tag, missing metric values by
band (A1–C1 and TOTAL), and candidate/missing ODWN links. Inspect a lemma/POS with
`--lemma bank --pos 'N(soort)'`. Displayed entries say **source exposure**, never certified
CEFR proficiency. `sense_se-id` targets **ODWN LexicalEntry.id**, while `sense_sy-id` is retained
separately as a source synset ID. No ODWN existence check or semantic approval is inferred; the
ODWN importer belongs to T-103. Basic and sense-linked observations remain separate, including
multiple senses at the same lemma/POS.

Use `--output .cache/content-sources/nt2lex-observations.json` to write all observations and
both inspected manifests to a new file. The command refuses to overwrite and validates both
inputs before writing. A changed pin, malformed header/row, invalid UTF-8 or invalid numeric
metric exits with status 1 and a diagnostic. No partial lexical output is printed on failure.
`--basic-manifest` and `--senses-manifest` select alternative expected manifests, including the
committed offline excerpts; the defaults are the full research pins.

Each observation preserves every original TSV field, numeric distributions (`-` becomes `null`,
zero remains zero), source identity/hash, 1-based physical input line, raw record SHA-256
**including its original newline**, and extraction version. These are source observations;
importing grants no language review, CEFR certification, curriculum stage or ranking. The
algorithms port the row extraction and explicit crosswalk from research `build_evidence.py`,
`build_pilot.py` and `build_core_manifest.py` to Node without the research ranking/filtering.
