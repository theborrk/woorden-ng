# Reviewer B: batch 01

Batch `woorden-starter-v0.2-01` (S01–S10), reviewed against the fixed rubric on the current content hashes.
Per-entry evidence: `work-01/SXX.json`; assembled response: `review-response-01.json`; validator output:
`validation-01.json` (`"errors": []`).

| Entry                  | Overall | Critical and major findings                                                                                                                               | Minor findings                                                                                                         |
| ---------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| S01 ik                 | pass    | none                                                                                                                                                      | none                                                                                                                   |
| S02 zijn               | revise  | major, task ambiguity: in "Ik ___ ziek." the cue does not fix the tense, so "was" is valid but only "ben" is accepted                                     | PL meaning and hint "być, łączyć osobę lub rzecz z opisem" read as a second meaning "łączyć"                           |
| S03 goed               | revise  | none                                                                                                                                                      | the placeholder "-" is stored as a verified form; the example also targets the attributive form ID, wrong for predicative "goed" |
| S04 dank u wel         | revise  | major, task ambiguity: "___ voor het water." with cue "thank you, polite" also fits "Dank u", "Hartelijk dank", "Bedankt", "Dank je wel"; one answer accepted | none                                                                                                                   |
| S05 u                  | pass    | none                                                                                                                                                      | none                                                                                                                   |
| S06 begrijpen          | revise  | major, task ambiguity: "Ik ___ het niet." also fits "snap" and past "begreep"; only "begrijp" is accepted                                                 | none                                                                                                                   |
| S07 niet               | revise  | none                                                                                                                                                      | sense-level meanings say "in this context"; the /ni/ IPA variant lost its source condition "in fast speech"            |
| S08 kunt u dat herhalen | revise | major, task ambiguity: whole-sentence production accepts one string; "Zou u dat kunnen herhalen?", "Kunt u dat nog een keer zeggen?" and, under the EN cue, "Kun je dat herhalen?" would be marked wrong | none                                                                                                                   |
| S09 hebben             | revise  | major, task ambiguity: "Ik ___ een fiets." also fits past "had", and the cue's own "possess" invites "bezit"; only "heb" is accepted                       | none                                                                                                                   |
| S10 huis               | pass    | none                                                                                                                                                      | none                                                                                                                   |

No critical findings. No article, plural, verb form, spelling or IPA value is wrong, and no meaning or translation is wrong.

Every major finding is the same template problem. The cloze cue is the sense's meaning gloss, which does not fix the tense
of a target verb and does not rule out common synonyms or equivalent phrases. Each entry has a patch (tense in the cue,
or acknowledged alternatives). A shared cue rule on the author side would prevent the same issue in later batches.

Run notes:

- Source access: supplied evidence only. The environment's network policy blocked outside dictionaries (Wiktionary,
  woordenlijst.org, anw.ivdnt.org, onzetaal.nl, sjp.pwn.pl, kaikki.org), so no outside source was opened. Facts were
  checked against the packet records, NT2Lex figures against `evidence/sources/nt2lex-basic.tsv`, spans in NFC/UTF-16,
  and Commons audio paths against the MD5 of their file names.
- `model_id` is `null`: this environment does not allow model identifiers in pushed files. `run_reference` links the
  session that performed the review.

**Counts:** pass 3 · revise 7 · uncertain 0
