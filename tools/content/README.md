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

## SUBTLEX-NL frequency import (T-102)

Download the two pinned workbooks into ignored `.cache/content-sources/`. The pins in
`tools/content/pins/subtlex-{full,cd2}.json` preserve the research snapshot's URL, retrieval
instant, byte size and hash using T-100's manifest schema. Downloads are a separate contributor
operation; the importer and tests never access the network.

```sh
npm --silent run content:subtlex -- .cache/content-sources/subtlex-full.xlsx .cache/content-sources/subtlex-cd2.xlsx --queries queries.json
```

`queries.json` is an array such as
`[{"surface":"pinnen","lemma":"pinnen","pos":"verb"}]`. Omit `--queries` for counts only.
Each file must match its pin, exact 17-column header, typed numeric/text fields, CD threshold
and data row count (437,503 / 150,357). Rows stream; shared strings are cached by the XLSX reader.
Only requested surface rows and dominant-lemma rows are retained. Successful stdout is one JSON
report containing both manifests, counts, units, raw lookup observations and a separate list of
unmatched or ambiguous joins. `pos_ambiguous` flags multiple reported surface POS or other
observed dominant POS for the requested lemma, even when the dominant-POS join matches. Any failure exits nonzero with stderr and no partial report.

Surface counts, CD and Zipf remain separate from lemma/POS counts. `FREQlemma` is preserved as
raw evidence, never added across inflections or used as a substitute for the dominant lemma/POS
count. Lemma queries use a unique matching `dominant.pos.lemma.freq` total; differing totals or
missing values yield unknown. Scoring additionally requires the exact surface observation's
dominant lemma and mapped POS to match the request. Unknown/unmapped POS, missing dominant
fields and mismatches leave scoring lemma fields null while retaining surface evidence.
The conservative POS map follows the research prototype: noun N, verb WW, adj/adjective ADJ,
adv/adverb BW, pron/det VNW, conj VG; other POS remain unmapped. No sense frequency is inferred.

Each observation's `record_sha256` hashes `JSON.stringify` of the raw field object with keys sorted
(empty cells are null), encoded as UTF-8. It retains the research record hash for the preserved `pinnen` observation and binds values
independently of worksheet location.
`worksheet_row` is the row in the imported file, not a claimed original row of an excerpt.
Dot-delimited POS and frequency strings are preserved verbatim.

The full OSF downloads currently redirect to a host blocked by this environment's policy.
`tests/fixtures/content-sources/subtlex-records.json` preserves the available research observation
of full-workbook row 19813 (`pinnen`); `subtlex-excerpt.xlsx` reconstructs its header and cell
values for offline parser tests. It is **not** a byte-cut workbook excerpt or proof of either
full-file count. Synthetic inflection/conflict workbooks are created only in test temporary
directories. Replace the reconstructed fixture with direct pinned-file excerpts and retain their
record hashes when the downloads become available; run the full command and paste its report
into the PR before marking AC1 complete.

## Advisory OpenTaal spelling

Download the two URLs in `sources/opentaal-*.manifest.json` into the ignored
`.cache/content-sources/`. These manifests adapt the research pins to T-100's schema;
both byte counts and SHA-256 hashes must match before any spelling observations are used.
The CLI reads local files only and never downloads a fallback:

```sh
npm --silent run content:spelling -- import .cache/content-sources/opentaal-wordlist.txt --version .cache/content-sources/opentaal-version.txt
```

The JSON import report includes both manifests, the verbatim version marker, total rows,
unique spellings and duplicate rows. Parsing runs to the end; invalid UTF-8, incomplete rows,
malformed markers and version disagreements fail without printing a success report. Nothing
is written or activated by this command. Keep downloads and saved reports in the ignored cache.

Append `--entries <entries.json>` to check an array of records with an existing `id`, a
`headword` without its presentation article, and an optional `kind` of `headword`, `compound`
or `mwe`. Other fields are retained verbatim in each result's `record`. For example:

```json
[
  { "id": "existing-lexeme-id", "headword": "zorgverzekering", "kind": "compound" },
  { "id": "existing-construction-id", "headword": "kunt u dat herhalen" },
  { "id": "existing-service-id", "headword": "DigiD" }
]
```

Exact matching is case-sensitive, without trimming, accent removal, article stripping or
fuzzy matching, as in the research `build_evidence.py` prototype. Each hit includes the
original spelling, 1-based line within the identified input snapshot and SHA-256 of the
original line including its newline. Each result references the list snapshot ID/hash/version.
Misses produce a `review` advisory and retain the record; a hit supports spelling membership
only, never meaning, article, level, language review or release eligibility.

The summary separates headwords, declared compounds, MWEs (whitespace or explicit `kind`),
and the case-sensitive named-service allowlist `DigiD`/`BSN`, with hits and advisories counted
within each group. Compounds require contributor classification; the spelling list cannot
establish compound structure. Named-service allowance is independent of list membership:
both names happen to occur in the pinned full list, but a miss still goes to review.

For an explicitly pinned excerpt or another local snapshot, supply both
`--wordlist-manifest <manifest.json>` and `--version-manifest <manifest.json>`. These use
the same T-100 manifest validation; they are explicit pins, not an automatic update of the
default snapshot. The committed excerpt and examples under
`tests/fixtures/content-sources/opentaal/` run without the downloads or network.
