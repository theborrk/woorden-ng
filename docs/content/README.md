# Content

What the app teaches, where its facts come from and how quality is checked without a Dutch
speaker. The decision behind it is [ADR 0005](../adr/0005-source-and-ai-content-review.md); the
tasks are T-100 to T-122 ("Content backlog" in [`../tasks/README.md`](../tasks/README.md)).

| Document                                                                 | What it covers                                                           |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| [`research-report.md`](research-report.md)                               | Findings and recommendations of the October 2026 content research        |
| [`curriculum.md`](curriculum.md)                                         | Cumulative sense targets per stage, ranking, packs, ordering, the pilot  |
| [`entry-specification.md`](entry-specification.md)                       | The sense entry exchange format: IDs, forms, examples, spans, provenance |
| [`verification-pipeline.md`](verification-pipeline.md)                   | Source pinning, authoring, exercise rules, sample checks, status model   |
| [`source-matrix.md`](source-matrix.md)                                   | Every source inspected: access, coverage, format, verdict                |
| [`legacy-audit-report.md`](legacy-audit-report.md)                       | The audit of all 1,946 original entries (keep, fix, opt-in, consolidate) |
| [`audio-policy.md`](audio-policy.md)                                     | IPA, recordings and device TTS                                           |
| [`comparison-and-merge-decisions.md`](comparison-and-merge-decisions.md) | How a second model's analysis was compared and merged                    |
| [`legacy-inventory.md`](legacy-inventory.md)                             | Features of the original app (T-001)                                     |

Data files named in these documents (`starter-pack.json`, `legacy-audit.csv`,
`core-target-candidates.json`, `priority-gaps.csv`, the review batches and so on) live in
[`research/content-2026-10/`](../../research/content-2026-10/), with the layout described in its
README. They are research drafts: nothing there is reviewed or eligible for study yet.
