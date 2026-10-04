# Local source inspection

## Starter draft inspection (T-115)

Library displays S01–S60 from `content/inspection/starter-s01-s60.json` (T-116). Refresh or check
the complete inspection artifact with:

```sh
node tools/content/import-starter-inspection.mjs --write --all
npx prettier --write content/inspection/starter-s01-s60.json
node tools/content/import-starter-inspection.mjs --check --all
```

The original S01–S10 artifact remains available with the default commands:

```sh
node tools/content/import-starter-inspection.mjs --write
npx prettier --write content/inspection/starter-s01-s10.json
node tools/content/import-starter-inspection.mjs --check
```

The import checks issued sense/lexeme/form/example IDs and semantic hashes and retains the
research entries verbatim, including original Russian mappings. Its separate inspection assessment
is unreviewed, structurally unchecked and release-blocked. The research's source statuses are
displayed as assertions with field provenance/citations, not adopted production verification.
The original source records needed by T-111's stricter boundary are not bundled with this slice.
This inspection artifact is not a canonical draft state or curated pack; it cannot enable study,
approved audio or publication. No model, audio service or old-app progress is used. S08's absent
whole-expression IPA remains unavailable, with no generated phonetics.

The full fixture accounts for 60 senses and 65 EN/PL-translated examples. Import checks each
NFC/UTF-16 answer span, its ordered segments and issued target-form references. Example details
expose the original joined, discontinuous and reflexive answer contracts. Shared `bank` and
`alsjeblieft` lexeme/form groups collect source IDs while retaining each sense's original
observation and hash; meanings, examples and sense identities remain separate. This grouping
does not resolve conflicting research assertions or grant review approval.

The full fixture ships as a bundled JSON asset, loaded with a visible failure/retry state.
The web service worker precaches that asset for offline inspection; the Android bundle includes
it locally. Keeping fixed research data outside JavaScript preserves the app's script-size budget.

## Source files

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

## External draft batches (T-111)

Import a saved artifact with no network or model invocation:

```sh
npm run content:import-drafts -- batch.json --output draft-state-1.json --evidence evidence.json
npm run content:import-drafts -- batch.json --state draft-state-1.json --output draft-state-2.json --evidence evidence.json
```

The constrained envelope is `{"schema_version":"woorden-draft-batch-1","batch_id":"batch-01",
"generation":{...},"entries":[...]}`. Each entry follows the sense-entry exchange schema above.
Generation metadata requires `vendor`, `model`, `version`, `run_ref`, `prompt_sha256` and
`input_sha256`; use explicit `null` for unknown values, never an invented model version or hash.
Entry-level generation metadata is retained alongside this batch provenance. Evidence is supplied
separately as an object keyed by each entry's `fixture_ref`, with the records/claims format above.
Missing evidence is allowed only when the entry asserts no sourced facts requiring it.

`fixture_ref` is a stable allocation label (letters, digits, `.`, `_`, `:`, `-`), including the
research's S01–S60. A new sense needs a new label. Producer UUIDs act as stable identity references:
keep them when changing spelling, meanings or order. The importer reuses committed allocations,
allocates opaque UUIDs once for new entities, and resolves sense/form/example links without
rewriting source text. Shared producer lexeme IDs retain the same canonical lexeme ID. Splitting,
merging or moving a sense to another lexeme is rejected; it needs an explicit later migration.

The output is an operator-owned state containing the extended allocation registry, canonical
draft entries, raw artifact SHA-256/byte counts, batch manifests with current entry hashes and
archived replaced entries/review evidence. Commit the reviewed state deliberately; producer input
cannot replace the committed registry or supply this state. The CLI writes only a new output file
after the entire batch validates and refuses to overwrite existing files. Stdout is a change
report with added/updated/unchanged IDs, revisions, before/after hashes and review invalidation.
Repeat imports preserve IDs, revisions, counts and any operator-recorded checks on unchanged
payloads. Edits increment the revision, archive the old record and reset language checks to
`not_run`, disposition to `draft` and release to `blocked`.

Imports reject producer language/release approvals (`language_reviewed`, `batch_checked`,
`ai_reviewed`, `eligible`) and enabled grading/audio claims. Source evidence still goes through
T-110's validator. Imported drafts never become curated content; actual sample checks and pack
compilation belong to T-113/T-114. The research pack is not automatically imported or activated.

## Sample-check packets (T-112)

```sh
npm run content:sample -- manifest.json --entries draft-state.json --seed 42 --output new-packet.json
```

Use one T-111 batch manifest (from `state.batches`) and its canonical entries, either an entry array
or an object with `entries`. All manifest hashes must match current payloads. The output file must
be new; stdout contains the same compact JSON bytes. Export does not alter content or check states.

Batches of at most 20 entries are sampled entirely. Larger batches have ten entries ranked by
SHA-256 of `<integer seed>:<stable ID>`, plus a fixed selection of up to ten risk entries, covering
risk kinds first and then filling by ID. A random/risk overlap appears once with both selection
roles; changing the seed leaves the risk selection fixed. Risk categories cover shared lemmas,
separable/reflexive verbs, alternative articles, fixed expressions, declared whole-sentence tasks,
and the explicit `polish_false_friend` risk marker. These are sampling labels, not language verdicts.

The packet includes all batch hashes, sampled drafts, asserted source values with scoped citations,
rules R1–R5, the three questions and the response format. Source records, author verdicts and
self-check metadata are omitted; citations alone do not prove a fact. Research drafts can be
exported for inspection without becoming checked or eligible. Rehashing content is not validation.
Use `tools/content/schemas/sample-check-response.schema.json` for responses; `fix` requires a
question/problem type and JSON Patch add/remove/replace operations, and `unsure` requires a reason.
T-113 checks exact sample/hash/seed/vendor binding and imports actual responses. No provider is called.

## Sample-check response imports (T-113)

```sh
npm run content:import-sample -- response.json --packet packet.json --state draft-state.json --dry-run
npm run content:import-sample -- response.json --packet packet.json --state draft-state.json --output checked-state.json
```

The packet and state are operator-owned outputs of T-112 and T-111. The importer regenerates the
packet against current entries, checks its stored batch manifest, and requires exactly one response
per sampled ID/hash with the original seed. Unknown author vendors, same-vendor reviews (ignoring
case and surrounding whitespace), stale entries, changed packets and incomplete responses fail
before any output. Vendor names are recorded provenance, not cryptographic identity verification.

The report gives the batch outcome, systematic problem types, risk meaning errors and every
entry's language-check state. Repeated problem types fail the batch. A wrong meaning/translation
in a risk category also fails: R1–R5 do not cover semantic errors. Failed batches receive no check
approval; prior check evidence remains in the append-only log. Passing batches assign sampled
passes `ai_reviewed`, unsampled entries `batch_checked`, fixes `revision_requested`, and uncertain
entries `uncertain` and `flagged`. Existing rejected/superseded dispositions remain intact.
Patches are attached as evidence and never applied automatically. Release stays `blocked` until
the separate compiler calculates task/locale eligibility.

The new state retains exact UTF-8 response text, its raw-byte SHA-256, the packet and the import
result under `sample_checks`. Reimporting identical bytes on unchanged entries leaves the state
and report unchanged; edited entries reject stale replay. Later draft edits archive old evidence
and reset only the edited entry to `not_run`. Dry-run writes nothing; saved imports exclusively
create a new file and refuse to overwrite prior state. Tests use synthetic responses only and do
not confer checks on the research pilot.

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

The offline fixtures `subtlex-excerpt.xlsx` and `subtlex-cd2-excerpt.xlsx` are direct cuts
of the pinned workbooks: the original header and `pinnen` row (19813 / 19887).
`tests/fixtures/content-sources/subtlex-excerpt.records.json` maps excerpt row 2 to each
original row and retains its canonical field hash and full snapshot hash. Extraction copies
worksheet cells, including cached formula results, and referenced shared strings from the
original XLSX XML, then repackages them with row coordinates and string indices remapped.
It does not recreate values from the research JSON. The adjacent manifests pin each compact
XLSX and identify its bulk snapshot in lineage; `subtlex-records.json` retains the original
research values for comparison. Synthetic inflection/conflict workbooks exist only in test
temporary directories. Full-file counts are proved separately by the CLI report in the PR.

The full workbook's Zipf formulas are read as their cached numeric results, never evaluated.
Missing, non-numeric or error caches fail numeric validation. Numeral lemmas stored as finite
numeric cells remain numbers in raw evidence; they are not coerced into string lemma joins.
Leading-hyphen lemma cells saved upstream as formula/error artifacts are retained as raw
objects and cannot match a string lemma query. They are not evaluated or repaired.

### Exercise rules (ADR 0005)

Examples may carry a structured `cue` with `mode: "fill_in" | "production"`, localized `gloss`,
`tense` and `person` (required for linked verb answers), and optional `adjective_use`. Whole-sentence
production and multiword phrase cloze answers need at least two distinct accepted alternatives or
`self_graded: true`. The first accepted answer still matches the ordered NFC/UTF-16 answer spans;
additional answers are authored alternatives, not a claim that the validator can judge synonyms.

R1–R5 findings appear in the existing `errors` array and a structured `findings` array with `rule`,
`entry_id`, `fixture_ref`, nullable `example_id`, JSON-pointer `field` and `message`. R3 compares
normalized whole words/sequences in both legacy `context` and `cue.gloss` against accepted answers,
listed forms and the lemma. The explicit S09 possess/posiadać conflict is scoped to its immutable
sense ID from `research/content-2026-10/review/responses/work-01/S09.json`; no other cross-language
synonym is inferred. R4 rejects empty/dash surfaces and attributive form links when the structured
cue or linked source tags identify a predicative example. R5 detects the recorded English/Polish
meta wording in learner meanings. These bounded checks cannot establish naturalness or complete
alternative coverage. Passing them never changes language/release status; pilot corrections remain
T-169 work. Cue/self-grading changes are part of the payload hash and invalidate prior hash evidence.

## Task/locale pack compilation (T-114)

```sh
npm run content:compile -- checked-state.json --id PACK_UUID --version PACK_VERSION --evidence evidence.json --output new-pack.json
```

The version and opaque pack UUID are contributor supplied; retain the ID across versions and
allocate a new version when adopting changed content. Output creation is exclusive. The artifact
contains a curated `pack`, its `manifest`, a per-entry/task/locale blocker `report`, and complete
`excluded` records outside the curated pack. Inputs and research content remain unchanged.
The manifest binds canonical pack bytes, every entry's semantic and full-record hash, task
references and the entry/compiler schema versions. Object keys are canonically sorted for hashes;
entry/media ordering is deterministic. No time, model call, installation or automatic publishing
is involved. Consumers must use the emitted task list rather than infer eligibility from a field
on an entry. Retained source records and disabled candidate fields are reference data.

The compiler rechecks structural/identity contracts with T-110 and validates required facts against
separately supplied exact pinned observations. A missing optional source fact blocks its dependent
task, not written recall. EN and PL decisions are separate; no translation fallback is invented.
Written tasks require a sourced lemma and a meaning. Article tasks additionally require a sourced
accepted article set; form/cloze variants reference only supported forms and complete examples for
the requested locale. Missing optional IPA/media does not disable written tasks.

Language approval comes from T-113 receipts, not producer strings: raw response, packet, stored
result/hash and the latest check event must agree on the current payload. Retained archived batch
revisions allow an unchanged sibling to keep its check after another entry is edited. An edited
payload, failed/fix/uncertain check or flagged/rejected/superseded disposition cannot authorize
curated tasks. Invalid receipt evidence is reported explicitly. The pure `taskEligibility` function
receives independently verified validation and a hash-bound language-check assessment; the compiler
establishes those assessments before calling it. Full source text, IDs and provenance are retained.

Listening/spelling require a separate audio QA assessment and picture naming a referent-image
assessment. Entry URLs, approved flags, mnemonic images and untested TTS never suffice. Optional
`--media QA.json` accepts an operator-owned array with `id`, `kind` (`audio` or `referent_image`),
`entry_id`, current `content_sha256`, asset `sha256`, `available:true`, `qa:"passed"`, `qa_run_ref`
and `license`. Selected assessments enter the hash-bound pack. These are supplied QA evidence;
T-118 owns actual media acquisition/checksum/text/playback verification. This compiler neither
checks audio pronunciation from bytes nor fabricates QA. With no such evidence those tasks stay
blocked, while eligible written tasks can compile.

The delivered 60-entry research pack can be inspected with this command too: its curated output
has zero eligible entries and explicit missing-check/source blockers. It receives no fabricated
review, source observations, media or release status from compilation.

## Optional Apertium conflict observations (T-121)

```sh
npm run content:apertium -- .cache/content-sources/apertium-nld.dix
npm run content:apertium -- .cache/content-sources/apertium-nld.dix --compare primary-observations.json
```

The default pin is `sources/apertium-nld.json`, adapted from the research acquisition.
`--manifest` selects another expected pin, including the committed excerpt. The CLI reads
local bytes only, verifies the hash/size and parses XML to the end before printing a report.
Active `/dictionary/section/e` nodes count; comments and paradigm-definition entries do not.
Original record XML, hashes, section IDs, active-entry ordinals and raw paradigm IDs accompany
selected comparisons. Ordinals describe the imported file, not the original bulk excerpt lines.
No files or primary forms are modified. Invalid bytes/XML/arguments exit nonzero without a
partial success report. XML external declarations are rejected.

The optional comparison input is an array of selected primary observations: `lemma`, `gender`
(`m`, `f`, `mf`, `nt`) and/or boolean `separable`, plus `source.source_id` and
`source.record_sha256`. Retain the original source fields/locators as additional properties;
they are copied unchanged into each result. These are contributor-selected cited observations,
not automatically verified evidence. Match exact lemmas only. `mf` overlaps `m` and `f`;
unsupported or missing features yield no disagreement, not agreement. Results include all matched
observations and an explicit inspect-only action, lineage caveat and `not_run` language check.

Selected feature decoding follows recognizable paradigm-ID suffixes: `__n_m`, `__n_f`,
`__n_mf`, `__n_nt`, `__vblex`, `__vblex_sep`. It does not generate inflected forms, decode other
paradigms or adjudicate facts. Apertium's `landbouw` uses `LWOO__n_nt`; disagreement with a
masculine primary observation remains visible. Separate projects can share lexical lineage:
neither agreement nor a majority grants source correction or language approval.
