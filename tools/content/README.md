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

## Sense-entry validation

T-110 adopts the 0.2 exchange contract in
[`schemas/sense-entry.schema.json`](schemas/sense-entry.schema.json). Validate a **single entry**
(not the enclosing research pack):

```sh
npm run content:validate-entry -- entry.json evidence.json
```

The command prints JSON with structural/source errors and task-family blockers for EN and PL,
returns 0 for a valid draft or 1 for an invalid import, and never writes content or review state.
The existing `content:validate` command still checks the immutable legacy seed. `verify` runs the
new validator's unit tests too. No network, Python or provider service is involved.

`content/id-registry.json` preserves every research allocation and adds sense-to-lexeme bindings.
Labels are allocation metadata: spelling edits retain the issued UUID. New allocations must be
committed deliberately; import input cannot replace the registry. The semantic hash excludes
`review` and `content_sha256`, sorts object keys and uses compact UTF-8 JSON. NT2Lex exposure
counts retain the prototype's float serialization, including `.0`, to preserve the starter hashes.

The separately supplied evidence bundle has this shape:

```json
{
  "records": { "dictionary-record-id": { "forms": [{ "form": "neem mee" }] } },
  "claims": [
    {
      "pointer": "/forms/0/surface",
      "source_id": "dictionary-record-id",
      "selector": "/forms/0/form"
    }
  ]
}
```

A claim must select the exact asserted value from a record whose canonical SHA-256 matches the
entry's source manifest. Inline form/IPA selectors must agree with that selection. URLs alone
provide no support. Source importers supply acquired observations; this validator checks support,
not the trustworthiness of the dictionary or the operator supplying its pinned record. Authored
interpretations cannot be promoted by citing a source gloss. For transformed/group facts, supply
an exact scoped observation or retain draft status until the relevant source importer exists.
JSON-pointer prefixes inherit provenance, more specific prefixes override parents, and direct
form/IPA references override their group. Dangling pointers and source IDs fail validation.

Missing meanings/translations are explicit `null` or empty meaning arrays; missing examples are
`[]`. EN/PL keys remain required. These values do not count as coverage. The report distinguishes
`data_ready` from curated `eligible`: T-110 validates drafts, so independent review is always a
release blocker. Audio/image QA remains a required gate (T-118 and later media work); a URL or an
imported approval flag cannot satisfy it. T-113/T-114 own actual review acceptance and compilation.
Missing optional IPA does not block written tasks. No locale fallback or content is generated.

The research starter pack remains unchanged and unreviewed. Its omitted source archives and
broad research source tags are insufficient evidence for this stricter import boundary; missing
observations produce explicit errors rather than inheriting the prototype's blanket fact status.
