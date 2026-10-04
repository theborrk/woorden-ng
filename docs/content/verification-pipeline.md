# Verification without a Dutch-speaking team

The pipeline combines source observations, constrained authoring under fixed exercise rules, deterministic checks, one sampled check per generation batch by a different-vendor model, and problem reports from learners. **Agreement between models is not an estimate of truth.** Shared training material and shared dictionary errors create correlated mistakes. Record source families as well as product names: English, Dutch and Polish Wiktionary are not three independent dictionaries; wordfreq and SUBTLEX share lineage for some frequency material. The policy is [ADR 0005](../adr/0005-source-and-ai-content-review.md).

## Execution contract

1. **Acquire and pin.** Download a named snapshot; retain URL, byte count, SHA-256, schema/version, retrieval date and source-specific attribution. Parse to end and verify decompression/row counts before adoption. Partial files fail closed. Preserve original seed IDs and RU. Excerpts retain record hashes and locators in the saved excerpt set; a locator in an excerpt is not an original bulk-file line number.
2. **Select the sense.** Map lemma/POS and candidate sense to source definitions. Keep a human-readable Dutch definition, translation scope and reason for daily-life usefulness. NT2Lex `sense_se-id` joins ODWN **LexicalEntry.id**, not child Sense.id. Flag automatic mappings, homographs, reflexives, mass/count changes and source definition gaps. Freeze the candidate list before reporting coverage.
3. **Extract facts.** Use explicit ODWN WordForms articles, Kaikki gender/form/IPA fields, and source-aware mappings. Retain raw observations. Filter table labels, archaic/regional variants and form-of records; do not smooth a disagreement by majority vote. Spelling absence in OpenTaal is advisory, especially for productive compounds, phrases and names. A model may select a source-attested form but must not invent morphology/IPA.
4. **Model A authors a draft.** Supply the intended sense, selected evidence, learner PL/EN, target band, earlier concepts/scaffold, grammar prerequisites and fixed output schema. Follow the exercise rules R1–R5 (ADR 0005). Generate NL examples and direct EN/PL translations, usage distinctions and optional hints. Do not add sources the author has not inspected. Preserve model/vendor/version when actually known, prompt hash, inputs and output hash. No runtime AI is introduced in the PWA or Android app.
5. **Validate deterministic contracts.** Validate JSON Schema, IDs and cross-links, content hashes, required locales, field-level provenance, article/POS compatibility, source existence, finite numbers, NFC/UTF-16 spans, separated verb segments, allowed forms and duplicate task contracts. Check that de/het alternatives are not mutually rejected and that mass plurals are not activated. Check vocabulary and grammar prerequisites separately. Structural pass does not confer language quality. The validator also enforces the exercise rules it can detect (R1–R5).
6. **Sample-check the batch.** One session of a different-vendor model (Claude for OpenAI-authored content) checks a sample of the generation batch: the whole batch if it has 20 entries or fewer, otherwise 10 entries drawn with a recorded seed plus up to 10 risk entries. Give it the sampled entries, their source facts and the three questions below; omit the author's own verdicts. Commit the packet, the response, the seed, the reviewer's vendor and run reference and every entry hash of the batch. No live provider SDK is used in the repository.
7. **Act on the outcome.** A problem in two or more sampled entries is systematic: add or tighten a rule (validator and author brief), regenerate or patch the batch and sample again. Isolated `fix` verdicts are patched; `unsure` entries stay `flagged`. A source mismatch blocks the affected field until the original dictionary record or an independent source (ANW, Taaladvies/Onze Taal) settles it. A model majority never overrules source evidence.
8. **Compile by policy.** Only eligible task families enter a versioned curated pack. Preserve draft/flagged material for inspection and explicitly opted-in private use. No blanket entry approval from one passed field. Produce coverage and change reports; edits invalidate affected reviews. Rejected and superseded records remain traceable.
9. **Close the loop with reports.** Learners report problems from the app; exported reports become a fix batch (step 6, checked in full when small). Reports never change content by themselves.

## Exercise rules

| Rule | Requirement                                                                                                                                  | Batch 01 example it prevents                                  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| R1   | A verb-form answer has a cue that fixes tense and person; accepted answers include common synonyms, formal/informal variants and short forms | "Ik ___ ziek." accepts only "ben" although "was" fits the cue |
| R2   | A whole-sentence answer lists its common variants or is self-graded                                                                          | "Kunt u dat herhalen?" rejects "Zou u dat kunnen herhalen?"   |
| R3   | A cue gloss contains no word that is itself a valid answer                                                                                   | the cue "possess" invites "bezit" for "hebben"                |
| R4   | No placeholder forms ("-"); predicative and attributive uses link to the right form                                                          | "goed" stored with form "-" and an attributive form ID        |
| R5   | Learner-facing glosses carry no meta wording                                                                                                 | "negate the statement in this context"                        |

## Sample-check questions

For each sampled entry, including every example, the checker answers:

1. **Meaning and translation:** do the Dutch definition, the English and the Polish meanings and every example translation refer to the same intended sense, precisely (person, number, tense, modality, scope)?
2. **Dutch:** is every Dutch sentence grammatical and natural for everyday Netherlands Dutch, using the target sense?
3. **Exercises:** would any exercise reject a correct answer or accept a wrong one, given its cue?

Verdict per entry: `pass`, `fix` (with a concrete correction as JSON Patch operations) or `unsure` (with the reason). Facts (articles, forms, IPA) are checked by machine against sources; the checker flags one only when it clearly contradicts the cited source record.

## Status model

| Axis/status                                                                                  | Meaning and permitted actor                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Origin: `legacy`, `generated_draft`, `user_private`                                          | Where content came from; never erased by later checks.                                                                                                                                      |
| Structure: `unchecked`, `machine_checked`, `invalid`                                         | Deterministic validator, tied to schema/tool version and payload hash.                                                                                                                      |
| Facts: `missing`, `source_verified`, `conflicted`, `not_applicable`                          | Source import records an exact observation and scope. `source_verified` means supported by the cited observation, not proven correct.                                                       |
| Language check: `not_run`, `batch_checked`, `ai_reviewed`, `revision_requested`, `uncertain` | Only an imported sample check sets these: `ai_reviewed` for a sampled entry that passed, `batch_checked` for the other entries of a passing batch. Any edit returns the entry to `not_run`. |
| Disposition: `draft`, `flagged`, `rejected`, `superseded`                                    | Flags block affected tasks; rejection preserves archive history.                                                                                                                            |
| Release: `blocked`, `eligible`                                                               | Computed for each task and locale (ADR 0005, section 5).                                                                                                                                    |

`language_reviewed` is not assigned. The owner reviews the policy and the software, not each Dutch sentence.

## What the checks can and cannot show

Report denominators: entries per batch, sampled entries, verdicts, systematic findings, reports received and fixed. A passing sample says the batch has no common problem; it does not certify unsampled entries. Ten clean entries bound the error rate only loosely (exact one-sided 95% upper bound about 26%; 300 clean entries would give about 1%). Facts are covered by machine checks against sources, systematic problems by rules and samples, isolated language errors by risk samples and learner reports. Never claim a measured error rate without the samples and judgments behind it.

## What has run so far

All seed rows were screened by the authoring model; source excerpts were parsed and compared; 60 draft senses and 65 examples were authored; the deterministic delivery validator ran. The first full-review batch (S01–S10, `research/content-2026-10/review/responses/`) found no wrong fact, meaning or translation and one systematic exercise problem, which became rules R1–R5. Dutch TTS listening QA and learner testing have not run.
