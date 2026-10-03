# Evidence scope and provenance

The report's source counts refer to the inspected snapshots recorded in `source-inspection.json` and the source manifests, not to a claim about live totals on every later date.

- `inputs/`: immutable original seed and blueprint used for this research.
- `repository/`: inspected repository task template, task-check implementation and relevant adaptation documents. These are evidence copies, not modified project files.
- `lexical-index.json`: extracted dictionary, NT2Lex and frequency observations for legacy/pilot headwords, including record identities and raw source snippets.
- `sources/`: Kaikki excerpts, NT2Lex tables and source manifests. A dictionary source saying a spelling/form exists does not by itself establish that it is suitable for the selected sense or exercise.
- `web-adjudications.json`: targeted source-page observations for disputed senses, article variation, expressions and pronunciation distinctions.
- `pilot-frequency-supplement.json`: exact SUBTLEX row used for pinnen beyond the initial legacy index.
- Validation and coverage files: results measured from the delivery, with the limits of each denominator stated.

Two large Kaikki source files were found partial in the later local cache: the English-edition JSONL had 177,786,880 bytes against the previously inspected 256,173,808-byte file, and the Dutch-edition compressed file had 31,259,136 bytes against 133,385,673 bytes. They are not presented as complete downloads. Previously extracted valid JSON records were preserved and are included here; pilot supplements used complete parseable records from the retained prefix. The source matrix distinguishes original measured snapshot coverage from the available local excerpts. A production acquisition job must fetch complete files, validate their transport/decompression, and pin checksums before full-corpus analysis.

This archive therefore supports inspection and reproduction of the supplied pilot/audit against their preserved observations. It is not an offline mirror of every researched corpus. The candidate baseline retains explicit NT2Lex/ODWN identifiers, but bulk re-extraction requires the separately downloaded original corpora.

Source agreement must be assessed by lineage, not simply by counting URLs. Kaikki is an extraction of Wiktionary; different Wiktionary editions can copy one another; ODWN includes inherited RBN provenance. AI author and same-vendor self-check are not independent language reviewers.
