# Legacy audit interpretation

`legacy-audit.csv` contains all 1,946 original IDs exactly once. `legacy-audit-evidence.json` retains each entire original row, source observations, proposed POS, frequency lookup, decision and review limitations. The six-column CSV is the requested working artifact; the JSON supports reproducibility and inspection.

| Decision       | Count | Meaning                                                                                                                                                             |
| -------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| keep           | 1,268 | Retain intended sense as core candidate; universal enrichment and independent review still required.                                                                |
| fix            |   554 | Correct/scope meaning, POS, morphology structure, article variants or pack assignment. A proposal can be an ambiguity repair rather than a demonstrably false word. |
| move to opt-in |   122 | 106 specialist-agriculture and 16 register-specific/slang entries. Any additional fixes remain in the same row.                                                     |
| drop           |     2 | Retire redundant inflected presentation as an independently taught concept; preserve archive ID and alias to the canonical entry.                                   |

Decision precedence: a redundant same-sense form receives drop-as-alias; specialist/optional scope receives move-to-opt-in even if it also needs a correction; otherwise any specific correction/qualification gives fix; remaining screened candidates receive keep. None of these decisions grants curated-release approval. No original Russian text or old ID is erased.

## Factual checks and their scope

988/1,005 noun-labelled entries had lemma-level article support in the pinned observations; 17 did not have a usable structured singular-article observation. No clear incorrect de/het was established by this pass. Some unverified rows are plural presentations or nominalized forms, so absence of a singular article is not evidence of an error. Source alternatives remain sense-dependent. deksel accepts de/het; soort category can use either, while biological species uses de. A union of unsensed records must not make an otherwise incorrect sense/article combination pass.

All 479 non-empty vt/vtp/vd fields across 163 legacy rows matched feature-filtered source surfaces, and ten fields were null. This is **surface support**, not full verb verification: auxiliary conditions, reflexivity, word order, stress, source homograph alignment and incorrect attachment to a noun need separate review. The audit catches noun het eten carrying a verb paradigm. Blank fields are missing content, not automatically erroneous forms. Modal IPP and conditional hebben/zijn require contextual tasks.

The author inspected every compact NL/RU/EN/POS row. Individual split/correction notes are model judgments grounded in the linked observations where available; they have not been independently reviewed. Broad dictionary existence checks cannot validate all translations. This audit is a comprehensive first-pass classification with traceable proposed fixes, not proof that no further Dutch error exists.

## Why the original order underperforms the goal

The first 40 entries are nouns including many abstractions; the next sections include a long block of irregular verbs. Basic pronoun ik is s1506; huisarts is s1499. There are 191 agro and 35 slang labels, but many of those words are ordinary foods or everyday concepts. Only 169 rows contain an NL example, none has a supplied EN/PL example translation, and no entry has Polish. Separate daily usefulness, grammar prerequisites, frequency and difficulty; neither original array order nor an alphabetical tail should define lessons.

## Rarity is a measurement with a unit

113 legacy rows have an **exact-surface** SUBTLEX Zipf below 3 in this snapshot; 33 have no exact surface row in the full workbook lookup. This editorial threshold is a diagnostic, not a research-supported exclusion cutoff. `legacy-rare-surface-forms.csv` lists all 113. Rare subtitle forms include specialist bestuiven, bestuiver, akkerbouw, areaal and dorsen. But low-frequency forms also include everyday fietspad, houdbaarheid, cursist, postbezorger, kroket and frikandel: those are retained/repaired for practical usefulness. A compound's low surface frequency is not proof it is rare in the learner's life.

The 5,000-candidate baseline has 2,120 headword-matched candidate senses and 2,880 without a legacy headword match, across 3,328 distinct candidate headwords. It is not a finalized curriculum or a measured sense-coverage percentage. 873 legacy lemma strings are outside that provisional list; use the row decision and situation evidence, not list absence alone. Missing-candidate definitions are in `core-missing-candidates.csv`; focused Dutch-life additions are in `priority-gaps.csv`.

The pilot additionally exposes two missing meanings at existing headwords: bank as sofa is absent from legacy bank/bench glosses, and alsjeblieft as here you are is absent from the legacy please gloss. A meaning that happens to be related to an existing word still requires its own review and task contract.

## Source gaps for singular articles

| Legacy ID | Original headword  | Follow-up                                                                                   |
| --------- | ------------------ | ------------------------------------------------------------------------------------------- |
| s1035     | het fungicide      | Check intended sense/number in an explicit dictionary record; never fill from model memory. |
| s1069     | de drainage        | Check intended sense/number in an explicit dictionary record; never fill from model memory. |
| s1070     | de vruchtwisseling | Check intended sense/number in an explicit dictionary record; never fill from model memory. |
| s1072     | de zaaimachine     | Check intended sense/number in an explicit dictionary record; never fill from model memory. |
| s1110     | de moederplant     | Check intended sense/number in an explicit dictionary record; never fill from model memory. |
| s1111     | de bestuiver       | Check intended sense/number in an explicit dictionary record; never fill from model memory. |
| s1112     | de raszuiverheid   | Check intended sense/number in an explicit dictionary record; never fill from model memory. |
| s1114     | de bemonstering    | Check intended sense/number in an explicit dictionary record; never fill from model memory. |
| s1166     | de centen          | Check intended sense/number in an explicit dictionary record; never fill from model memory. |
| s1230     | de bespuiting      | Check intended sense/number in an explicit dictionary record; never fill from model memory. |
| s1237     | de kiemrust        | Check intended sense/number in an explicit dictionary record; never fill from model memory. |
| s1371     | de buren           | Check intended sense/number in an explicit dictionary record; never fill from model memory. |
| s1449     | de gegevens        | Check intended sense/number in an explicit dictionary record; never fill from model memory. |
| s1485     | de heleboel        | Check intended sense/number in an explicit dictionary record; never fill from model memory. |
| s1517     | de jongste         | Check intended sense/number in an explicit dictionary record; never fill from model memory. |
| s1598     | de mensen          | Check intended sense/number in an explicit dictionary record; never fill from model memory. |
| s1917     | de werktijden      | Check intended sense/number in an explicit dictionary record; never fill from model memory. |

All proposed source/translation/selection changes remain reversible annotations until reviewed. ADR 0003 excludes old-app learner-progress migration; legacy mappings here concern content provenance only.
