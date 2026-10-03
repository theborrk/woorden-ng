# Woorden NG: content research and implementation handoff

Research snapshot: 3 October 2026. The documents, audit, data, evidence and task drafts below are supplied together. This archive is a research handoff, not a merged repository change or a publishable language pack.

## Requested deliverables

| Deliverable | File | Actual completion and limits |
|---|---|---|
| A. Recommendations and opened sources | `docs/content/research-report.md` | Research report supplied; links and source limitations recorded. |
| B. Source matrix | `docs/content/source-matrix.md` | Download/access evidence, measured coverage, formats and verdicts. |
| C. Curriculum and representative fixture | `docs/content/curriculum.md` | Proposed 600/1,500/3,000/5,000 cumulative sense targets; ranking, packs, ordering and 60 entries. These are design targets, not official CEFR vocabulary requirements. |
| D. All 1,946 legacy decisions | `content/legacy-audit.csv` | Complete first-pass source and editorial audit; all original data retained separately. Decisions do not certify every meaning as correct. |
| E. Pilot entries and verification log | `content/starter-pack.json`, `review/verification-log.json` | 60 sense entries, 65 translated examples and source/automated checks. **Different-vendor review has not run. No entry is approved for curated release.** |
| F. Review-policy ADR | `docs/adr/0005-source-and-ai-content-review.md` | Proposed replacement for blueprint §14.2; not adopted. |
| G. Codex tasks | `docs/tasks/CONTENT-TASKS.md`, `docs/tasks/T-100-*.md` through `T-122-*.md` | 23 S/M drafts following the actual repository template and validator. No tasks have been implemented or merged. |

Supporting documents: `docs/content/entry-specification.md`, `verification-pipeline.md`, `audio-policy.md`, `legacy-audit-report.md`, and `comparison-and-merge-decisions.md`.

## Results and boundaries

- Audit: 1,268 keep, 554 fix, 122 move to opt-in, 2 consolidate as duplicates. The last action preserves original IDs and provenance; it is not an instruction to delete the raw record.
- Source observations support 988 of 1,005 legacy noun-labelled rows at lemma/article level. No clear wrong de/het was established. All 479 nonempty legacy conjugation-field surfaces matched inspected form evidence; this does not prove the intended sense, auxiliary or construction.
- The frozen 5,000-item baseline has 2,120 candidate headword matches and 2,880 misses against the legacy data. This is candidate/headword overlap, **not** verified sense coverage. Its 4,940 non-pilot candidates still require editorial selection, sense mapping and level review.
- Pilot: 60 senses, 65 examples, 320 distinct sourced form records and sourced IPA for 54 entries. Six entries explicitly lack whole-entry IPA. Generated meanings, translations, examples, usefulness and estimated levels remain model judgments awaiting independent review.
- Audio has not been downloaded, generated, listened to or tested on Android/browser devices. Device-local availability flags alone cannot establish acceptable pronunciation.
- Another model's supplied analysis was compared in the merge memo. That document comparison is not a completed rubric-based linguistic review of this pilot.

## Validate the supplied artifacts

Python 3.12 was used; Node.js is needed for the task check. From this directory:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-research.txt
.venv/bin/python tools/validate_delivery.py
node tools/validate_tasks.mjs
```

The first command validates JSON schema, identities, source support for forms/IPA, provenance links, answer spans, translation presence, release blocks, hashes, all legacy audit IDs/originals, and candidate counts. It does not judge Dutch naturalness or translation accuracy. It also refreshes automated review logs and example-prerequisite analysis. The second invokes the repository's actual exported task validator, captured under `evidence/repository/`, and checks the requested blueprint refs. This is not the application's full `npm verify` gate.

`evidence/delivery-validation.json` and `evidence/task-validation.json` contain the run results. `SHA256SUMS` pins the delivered bytes before any local regeneration; changing a generated file naturally changes its checksum.

## Rebuild the pilot from the included evidence

```bash
.venv/bin/python tools/build_pilot.py
.venv/bin/python tools/validate_delivery.py
.venv/bin/python tools/build_review_packets.py
```

Run these in order. Stable IDs are persisted in `content/id-registry.json`; keep that file across rebuilds. A content change creates a different review hash and invalidates previous approval for that payload. Rebuilding the pilot starts it as a draft again; validation restores only the machine-check status.

The supplied audit can be regenerated with `tools/build_audit.py`; it combines the preserved seed, lexical index and explicit editorial proposals in `tools/audit_decisions.py`. It does not automatically discover or linguistically adjudicate all errors.

`tools/build_evidence.py` and `tools/build_core_manifest.py` are research prototypes that additionally expect the original source-download cache at sibling path `woorden-research/evidence/data`. That full bulk cache is not in this archive. To rerun these acquisition/ranking prototypes, fetch and verify the original files using the source URLs/manifests and restore their expected names. The normalized evidence and frozen baseline needed to inspect this handoff are included. Production importers remain tasks T-100–T-107, not claims of completed repository tooling.

## Finish the independent language-review stage

1. Use `review/reviewer-B-prompt.md` and the fixed rubric in `docs/content/verification-pipeline.md`. Supply the six `review/review-batch-01.json` through `06.json` packets to a real model from a different vendor, such as Claude. Source records and uncertainty flags are embedded; this is not a request to rely on model memory for dictionary facts.
2. Retain the actual reviewer response, vendor/model identifier, run identifier and content hashes. Do not fabricate a response or treat the author's self-check as independent review.
3. Validate each returned response with `tools/validate_review_response.py` following its CLI help. The script is a dry-run evidence validator; it never publishes or changes review status. The production importer is a task draft.
4. Resolve disagreements using cited source evidence; revise and re-review changed payloads. Keep unresolved items and unsupported task modes blocked. Missing audio/IPA need their own gates and are not silently replaced with model-created phonetic facts.
5. Admit a curated pack only after the ADR's content, locale and exercise eligibility checks pass. T-120 remains blocked until actual external-review evidence exists.

`review/author-A-prompt.md` provides the corresponding source-constrained authoring contract for future batches. This session produced the draft through Codex and deterministic extraction; it did not call a second model vendor.

## Source and identity preservation

`evidence/inputs/seed-v1.json` preserves the original seed including Russian meanings. The audit CSV is UTF-8 with BOM for spreadsheet compatibility. `content/legacy-audit-evidence.json` retains every original row alongside the proposed decision. UUIDs distinguish lexemes, senses, forms and examples; the two bank senses and two alsjeblieft senses share their respective lexeme identity.

`evidence/lexical-index.json` and `evidence/sources/` contain the actual source excerpts used. Manifests, URLs, record hashes and source-family lineage are preserved. See `evidence/README.md` for the bulk-download integrity limitation. Wiktionary editions and derivatives are not automatically independent corroborators.

Only the report, curriculum, policy, schema, data and proposed task files should be selectively integrated into the repository after checking current IDs and existing decisions. Do not copy the entire evidence archive into the application bundle. Runtime AI calls, paid services and progress migration are not introduced by this proposal.
