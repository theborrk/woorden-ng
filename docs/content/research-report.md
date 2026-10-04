# Woorden NG content recommendations

> **Update 2026-10-04:** the review policy recommended below (a full different-vendor review of every entry) was replaced after its first batch by exercise rules, one sampled check per generation batch and learner reports. See [ADR 0005](../adr/0005-source-and-ai-content-review.md) and [`verification-pipeline.md`](verification-pipeline.md). The rest of this report is unchanged research.

Use a **sense-based practical curriculum**, with source-backed grammar and externally reviewed EN/PL content. The original seed is useful raw material, but its sequence, coarse POS tags, polysemy and missing Polish/examples make it unsuitable as a finished course. Keep it immutable as provenance while building curated sense entries over it.

## Recommended decisions

1. Plan cumulative A1–B2 budgets of **600 / 1,500 / 3,000 / 5,000 senses**, subject to learner feedback. These are product choices, not official CEFR word requirements. Teach communication repair, home, shopping/payment and travel early; add useful local services even when subtitles undercount them. Farming and genuinely register-specific slang are opt-in.
2. Use **NT2Lex + SUBTLEX-NL** for level/frequency evidence, then practical utility and situation/prerequisite coverage for order. Keep source distributions, model CEFR estimates and curriculum stages separate. Frequency is not sense frequency and first attestation is not a CEFR label.
3. Use **ODWN's explicit article fields and Kaikki's noun/verb/IPA records** together. Add Apertium and targeted independent dictionary/language-advice checks for conflicts. Models write meanings, examples, translations and hints; they do not manufacture dictionary facts.
4. Use **Tatoeba as an example-candidate source**, not a pre-approved bilingual deck. The inspected export has 2,273 Dutch sentences with direct links to both EN and PL. That is too small and uneven to supply the whole curriculum. Directly authored NL examples with separate direct PL/EN translation fill gaps.
5. Replace the human-only review label with **field-level source status + actual different-vendor AI review + deterministic task eligibility**. The author cannot self-promote a draft by recording agreement. Preserve unresolved disagreements, hashes and review artifacts; do not claim an accuracy percentage from model agreement.
6. Prefer downloadable tested audio for predictable listening tasks; treat local Dutch TTS as a device-tested fallback. Source IPA is useful reference data, not proof of audio quality. No runtime AI integration is proposed.

## Audit result

Every original ID appears once in `legacy-audit.csv`: **1,268 keep, 554 fix, 122 move to opt-in, 2 drop-as-separate-concept**. “Keep” means retain the intended content as a core candidate; it does not mean publication-ready. Universal missing Polish/example/review work is reported separately so it does not obscure concrete errors. The two drops are redundant inflected presentations of volgend/vorig and retain ID aliases and archive text.

Of 191 agro-labelled entries, 85 are useful general/core candidates (vegetables, quality, packaging, infection etc.); 106 remain optional specialist agriculture. Of 35 slang-labelled entries, 19 are ordinary useful colloquial/food/social content, and 16 remain optional. These are explicit **editorial judgments**, not measured CEFR facts.

The machine pass found lemma-level article support for **988 of 1,005 noun-labelled rows**, with 17 lacking usable structured singular-article evidence. It did not establish a clear wrong de/het from these sources. In particular, het deksel and het soort must not be blanket-corrected. All **479 non-empty vt/vtp/vd surfaces** matched feature-filtered source forms; ten such fields were null. This does not validate auxiliary selection, sense association or whether the row is a verb. The noun het eten incorrectly carries the verb eten paradigm; zijn/hebben choices need construction-specific rules.

The editorial pass records 118 sense/construction split proposals and 113 individually written correction/qualification notes (sets overlap), plus POS/morphology/theme repairs. Examples: voorkomen combines distinct stress/morphology; zich herinneren and zich inschrijven need reflexives; rekening and bank need sense separation; Russian glosses for eens, even, smaken, hulp, respect and vierkant mislead or mismatch POS. All original Russian is preserved, with corrections as annotations.

## What is missing and what the counts mean

A frozen provisional 5,000-candidate denominator is included: **2,120 candidate senses have a legacy headword hit; 2,880 do not**. This is not 42.4% verified sense coverage. Non-pilot candidates still require semantic/usefulness review; generic source senses can be unsuitable even at a common headword. The 60-entry representative fixture has ten missing standalone headwords/formulas, plus missing meanings at already-present headwords. `priority-gaps.csv` adds concrete Dutch-life gaps such as DigiD, BSN, statiegeld, health-insurance terms and check-in/out vocabulary; those additions are proposed, not silently certified.

The seed begins with forty mostly abstract/general nouns and places the pronoun ik at s1506 and huisarts at s1499. Long blocks of irregular verbs, agriculture and alphabetic additions explain the poor introduction order more directly than a frequency score alone. Re-sequence by usable situations and prerequisites, while leaving the original index as provenance.

## Pilot and remaining gate

The delivered JSON contains **60 sense entries, 65 NL examples with EN/PL translations and exact answer spans**, noun articles/plurals/diminutives where applicable, 14 sourced verb inventories, sense-level metadata, field provenance and entry logs. **54 entries have source IPA; six do not.** Forms/IPA were extracted from inspected records. Examples/meanings/translations/CEFR estimates are model-authored judgments.

There is **no actual different-vendor review in this session**, and no tested audio asset. Consequently, **0/60 entries are eligible for curated publication** under the proposed policy. The review prompt, six source-linked request batches, response schema and hash-verification importer make that final review executable in Claude, but they are not a substitute for it. Source-backed morphology and structurally valid JSON must not be misrepresented as a finished reviewed deck. The ADR is a draft for repository adoption; no repository commit, PR or release was made.

## Sources actually inspected

The [source matrix](source-matrix.md) gives acquisition URLs, units, measured counts and access limits. Key opened sources: [NT2Lex paper](https://aclanthology.org/W18-0514/), [NT2Lex downloads](https://cental.uclouvain.be/cefrlex/nt2lex/download/), [SUBTLEX OSF file API](https://api.osf.io/v2/nodes/3d8cx/files/osfstorage/), [Kaikki raw data](https://kaikki.org/dictionary/rawdata.html), [Open Dutch WordNet](https://github.com/cltl/OpenDutchWordnet), [Apertium Dutch](https://github.com/apertium/apertium-nld), [OpenTaal](https://github.com/OpenTaal/opentaal-wordlist), [Tatoeba downloads](https://tatoeba.org/en/downloads), [Lingonaut Dutch announcement](https://lingonaut.app/blog/breton-dutch-and-qol-updates-wnwl-12), [CELEX catalogue](https://taalmaterialen.ivdnt.org/download/celex-2-nl/), [ANW alsjeblieft](https://anw.ivdnt.org/article/alsjeblieft), [de/het deksel](https://onzetaal.nl/taalloket/de-het-deksel), [soort](https://taaladvies.net/welk-of-welke-soort/), [DigiD explanation](https://www.digid.nl/en/about-digid/what-digid), [BSN explanation](https://www.government.nl/themes/government-and-democracy/personal-data/citizen-service-number-bsn), [Android Voice](https://developer.android.com/reference/android/speech/tts/Voice), [browser voice locality](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService), and [Piper](https://github.com/OHF-Voice/piper1-gpl).

Lingonaut had no verified machine-readable Dutch course export; CELEX required login and was not downloaded; concreteness data retrieval failed; no source-backed concreteness scores were used. The comparison memo records measured corrections to the other model's claims. All inspection is dated 3 October 2026; pinned manifests/excerpts let the team distinguish changing pages from the data actually used.
