# Synthetic answer contracts

`house.json` is a narrowed synthetic test draft retaining S10's issued sense and
example IDs and original text. No new content IDs are allocated. Source claims
that are not tested here are downgraded; there is no linguistic or release approval.
The inspector validates the entry before checking that the contract's sense,
example, form IDs and accepted segments exactly match the selected example.

Run `node tools/learning/inspect-answer.ts tests/fixtures/learning/answers/house.json`.
The explicit contract reuses T-110's `accepted_answers` / `ordered_segments` /
`case_sensitive` fields. It specifies edge punctuation, article and spelling
requirements, known words, evidenced alternatives, and reviewed equivalents.
These supplied assertions are trusted prepared contract inputs, never dictionary
inferences or new language-check receipts. Unit-test alternatives/equivalents
are hypothetical test assertions, not approved Dutch content.

NFC and whitespace normalization never remove accents or stem endings. Only
listed edge punctuation is ignored. Articles are separated only for contracts
with an accepted article set; productive lexical success can retain an article
error. Strict spelling may fail while lexical recall stays visible. A known word
or a one-edit match cannot grant target success. Ambiguous valid alternatives
require prompt repair. Unmatched receptive free text requires self-assessment.
The tool produces inspector judgments only, without study admission, grading,
scheduler changes or content writes.
