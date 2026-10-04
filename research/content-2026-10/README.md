# Content research, October 2026

The data, review packets, schemas and Python prototypes of the content research for Woorden NG
(handoff dated 3 October 2026). The findings and designs are in [`docs/content/`](../../docs/content/),
the decision in [ADR 0005](../../docs/adr/0005-source-and-ai-content-review.md), the follow-up work
in tasks T-100 to T-122.

**Everything here is a research draft.** No entry is checked or eligible for study until the
pilot has passed its sample check and T-120 has admitted it (ADR 0005). Nothing here is built into the app, and
`npm run verify` does not lint or format this folder.

## Layout

The layout of the original handoff is kept, so its tools run unchanged from this folder.

| Path                | What                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `HANDOFF.md`        | The handoff's own README: deliverables, results, limits, how to rerun its validators                           |
| `content/`          | `starter-pack.json` (60 draft senses, 65 examples), `id-registry.json`, the legacy audit, candidate lists      |
| `review/`           | **[`SAMPLE-CHECK.md`](review/SAMPLE-CHECK.md)** (how a batch is checked), author-A brief; the retired full-review packets and runbook |
| `review/responses/` | Batch 01 of the retired full review: the evidence behind exercise rules R1–R5                                  |
| `review/sample-checks/` | Sample-check packets and responses, one per generation batch                                              |
| `schemas/`          | JSON Schemas of the starter pack and of a review response                                                      |
| `tools/`            | Python prototypes (`requirements-research.txt`); `review_b.py` drove the retired full review                     |
| `evidence/`         | Source manifests (URL, bytes, SHA-256), NT2Lex tables, Polish Kaikki excerpts, adjudications, summaries        |
| `SHA256SUMS`        | Checksums of the handoff as delivered                                                                          |

## Not committed

Left out because of size or because the repository already has them (`SHA256SUMS` still lists
them):

- `evidence/lexical-index.json` (93 MB), `evidence/sources/kaikki-nl-excerpts.json` (45 MB) and
  `evidence/sources/kaikki-en-excerpts.json` (22 MB): normalized source observations. The review
  packets embed the records each entry needs; the importers (T-100 to T-107) rebuild the rest from
  the pinned downloads. They exist only in the original handoff archive
  (`Woorden-NG-content-research.zip`, SHA-256 `370b62b5831ec8204130c7533c7db7dcd200b5f38f2f615ecc625921558a2270`),
  which the owner keeps.
- `evidence/inputs/seed-v1.json` and `evidence/inputs/blueprint.md`: byte-identical to
  `content/legacy/seed-v1.json` and `docs/architecture/blueprint.md` in this repository.
- `evidence/repository/`: copies of this repository's files as inspected on 3 October 2026.

`tools/build_pilot.py`, `build_audit.py`, `build_review_packets.py` and `validate_delivery.py`
need the left-out files; copy them (and the two inputs) back from the archive to rerun them.
`tools/validate_review_response.py` and `tools/review_b.py` (retired full review) need only what is committed.
