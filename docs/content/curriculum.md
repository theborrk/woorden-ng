# Woorden NG curriculum draft

Status: phase-1 proposal, 3 October 2026. Requirement links: F04, F08, W18–W21, T43, T50; blueprint §§7.1, 10, 13.1, 14 and 22. No entry in this document is certified as source-verified or independently AI-reviewed. The rows below are candidate meanings and editorial priorities.

## Counting and scope

A curriculum unit is a **sense of a lexeme or a useful fixed expression**. An inflected form, article exercise, listening direction and alternate example do not each add another vocabulary item. A second meaning may be introduced separately, with its own sense ID and progress. Word-family and unique-lemma counts are reported separately.

| Editorial level | New sense entries | Cumulative entries | Approximate expression/formula allocation within new entries | Communicative emphasis                                                                                                 |
| --------------- | ----------------: | -----------------: | -----------------------------------------------------------: | ---------------------------------------------------------------------------------------------------------------------- |
| A1              |               600 |                600 |                                                          100 | Repairing communication, simple requests, time, food, home, getting around, basic health/contact details               |
| A2              |               900 |              1,500 |                                                          150 | Routine work and services, appointments, housing problems, forms, shopping returns, explaining simple needs            |
| B1              |             1,500 |              3,000 |                                                          250 | Narrating events, explaining reasons, making arrangements, handling routine complaints and practical administration    |
| B2              |             2,000 |              5,000 |                                                          350 | More precise workplace/social language, news and institutions, nuanced opinions, negotiation and less routine problems |

These are configurable editorial budgets, **not official CEFR vocabulary requirements**. Expression allocations are planning estimates, not quotas to fill with weak material. Completing these cards does not establish CEFR speaking, listening or overall proficiency. See the [CEFR content-specification distinction](https://www.coe.int/en/web/common-european-framework-reference-languages/reference-level-descriptions).

The immediate release fixture contains 50 senses. Build and verify the first A1 block before generating thousands of entries. Keep the complete catalogue roadmap and account for every legacy ID. A learner's new-item allowance remains the blueprint's adaptive budget; catalogue size must not force a daily workload.

## Candidate pool

1. Import all NT2Lex basic entries with evidence through B2, retaining C1-only entries for later/optional consideration.
2. Add high-frequency SUBTLEX candidates after collapsing verified lemma/POS identities; begin with roughly the top 8,000 candidate lemmas, not 8,000 surface forms. The cutoff is a tunable discovery setting.
3. Add a scenario checklist for practical life in the Netherlands, including important low-frequency administrative and health-service vocabulary.
4. Add useful fixed expressions from lexical sources and reviewed example patterns. Do not invent phrase frequencies from constituent-word frequencies.
5. Import all legacy entries into an immutable inventory, including farming and slang. Legacy membership confers no automatic core priority.

OpenTaal's entire inventory and all WordNet senses are not curriculum candidate lists by default. Do not discard function words with an NLP stop-word filter. Do not reject useful compounds merely for low corpus frequency.

## Selection and ranking method

Keep three separate decisions: **what is useful**, **when to introduce it**, and **which tasks are safe to activate**. Review completeness is an activation gate, not a reason to pretend an essential word is unimportant.

### 1. Preserve source observations

- `nt2lex`: lemma/POS match, sense-link status and all A1–C1 F/U/D values. Record `earliest_attested_level` descriptively. A single occurrence is weak evidence; absence is unknown, not C2.
- `estimated_cefr`: editorial estimate with method, rationale and review state. Do not label it “NT2Lex level” after model adjustment. Assign the intended sense, not every meaning of the same spelling, to a learning band.
- `subtlex`: surface Zipf/count/CD and lemma/POS frequency as separate fields. Preserve supplied values and the exact workbook row/key. Never sum `FREQlemma` or `dominant.pos.lemma.freq` repeatedly across inflected forms. If equivalent rows disagree, flag the mapping.
- `usefulness`: model-rated against the fixed situation rubric below, with a short reason. Source dictionaries do not certify personal usefulness.
- `concreteness` and `image_suitability`: separate values. A concrete referent can still make an ambiguous picture task; an abstract sense can have a useful optional mnemonic.

### 2. Apply the everyday-usefulness rubric

| Utility value | Meaning                                                                                      |
| ------------: | -------------------------------------------------------------------------------------------- |
|             4 | Needed across common daily situations or for a high-impact practical interaction             |
|             3 | Recurring in an identified core situation                                                    |
|             2 | Useful general vocabulary, with less frequent immediate need                                 |
|             1 | Mostly a specialist interest, narrow setting or optional register                            |
|             0 | Unsuitable for the intended sense/curriculum: obsolete, erroneous, gratuitous or unsupported |

Each rating names at least one concrete situation. A second model checks utility and sense choice against the same rubric. Disagreement on a high-impact entry goes into the review queue; high frequency cannot override a wrong sense.

### 3. Rank within the eligible learning band

Proposed transparent starting score, all components normalized to 0–1:

```text
priority = 35 × utility
         + 25 × frequency
         + 20 × graded_exposure
         + 10 × situation_coverage
         + 10 × prerequisite_value
```

- `utility = rubric_value / 4`.
- `frequency`: 80% percentile of `log1p(verified lemma/POS frequency)` plus 20% percentile of `log1p(contextual diversity)`, within the pinned candidate inventory. Use the exact lemma row for CD when available. If only an unambiguous inflected-form match exists, retain that CD as a **surface-form proxy**, not a lemma-wide union count.
- `graded_exposure`: for each NT2Lex level up to the target learning band, compute the percentile of `log1p(U@level)` within comparable POS candidates with available data; use the maximum of those percentiles. This is a ranking heuristic, not a probability or proficiency score. An unmapped sense may inherit a clearly labelled lemma/POS exposure proxy, never a fabricated sense frequency.
- `situation_coverage`: 1 for a required situation/function still absent from the selected block, 0.5 for weak coverage, 0 for an already well-covered one; recompute as selection proceeds.
- `prerequisite_value`: 1 if the item supports at least three planned useful constructions in the next block, 0.5 for one or two, 0 otherwise. Record the actual construction links.

If a frequency or graded-exposure value is missing, store null and use a neutral 0.5 solely inside this scoring version, with an `imputed_component` flag. Do not expose the imputed number as a corpus measurement. Candidates relying on imputation require review before core selection. Multiword expressions use observed phrase data when available; otherwise this same explicit missing-data policy applies.

Weights, cutoffs and imputation are editorial hypotheses to calibrate against the audit and early learner feedback. Version the configuration and preserve score components, exclusions and selection reasons. Use stable IDs for deterministic tie-breaking. A future learner-specific utility adjustment remains separate from the shared pack's ranking.

### 4. Constrain the selected block

- Require coverage of each core situation before filling its remaining slots solely by rank.
- Prefer useful verbs and request/repair expressions early. Avoid producing a noun-heavy shopping catalogue.
- Keep separable verbs as their own lexemes; `opstaan` must not disappear into `staan`. Never add base-verb and particle frequencies to estimate its frequency.
- Keep function-word senses contextual. For example, `geen` requires a negative noun-phrase context; it is not just another unqualified translation of “not.” More complex items such as `er` will need separate constructions/senses.
- Split materially different meanings and distinguish collocations from freely generated sentences. MWEs have component links, but knowledge of components does not automatically mark the expression learned.
- Keep the same lexeme/sense in one canonical record referenced by several theme packs. Cross-listing must not duplicate mastery or increase the new-concept count.
- Avoid introducing several confusable siblings at once. Introduce a contrasting sense later, with a clear situation and separate retrieval evidence.

## Theme packs

| Pack                               | Default            | Initial placement                       | Scope                                                                                                       |
| ---------------------------------- | ------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Communication essentials           | Core               | First                                   | Greeting, asking for repetition, basic requests, understanding/negation, pronouns and question words        |
| Home and daily routine             | Core               | A1 onward                               | Rooms/objects, household actions, time, weather, everyday problems                                          |
| Food, shopping and money           | Core               | A1 onward                               | Everyday groceries, quantities/prices, payment, receipts, returns                                           |
| Travel and getting around          | Core               | A1 onward                               | Walking/cycling, stations, public transport, directions, booking and delays                                 |
| People and social life             | Core               | A1 onward                               | Family, invitations, plans, feelings, polite disagreement, relationships                                    |
| Health and appointments            | Core               | Basic A1, expanded A2/B1                | Describing needs, appointments, pharmacy and healthcare interactions; vocabulary rather than medical advice |
| Work and study                     | Core               | Basic A1/A2, expanded B1/B2             | Tasks, shifts, colleagues, instructions, explaining problems and arrangements                               |
| Housing, municipality and services | Core               | Selected essentials early; expand A2/B1 | Addresses/forms, repairs, utilities, municipal contact and common administrative vocabulary                 |
| Opinions, media and institutions   | Core at later band | B1/B2                                   | Reasons, reporting events, evaluating choices, general news/civic vocabulary                                |
| Farming/agriculture                | Opt-in             | By interest/need                        | Specialist equipment, husbandry, crops and processes. Reclassify shared everyday words individually.        |
| Informal speech/slang              | Opt-in             | After the relevant ordinary sense       | Register/region, risks of social misuse, receptive recognition first where appropriate                      |
| Personal interests and occupations | Opt-in             | At any band when requested              | Space/engineering, gardening, sports, pets, retail-specific terminology and other interests                 |

Everyday colloquial Dutch is not automatically “slang.” A term can be informal and still belong in the core; retain its usage label. Opt-in changes enrollment, not whether an entry exists or retains legacy history.

## Introduction order

Use short mixed sets inside a situation rather than an alphabetical list or a long block of near-synonyms. The following is a dependency order, not a calendar or a fixed daily quota:

1. Communication repair and useful requests, mixed with `ik`, `u`, basic verbs and a few concrete nouns.
2. Home/routine and simple present-tense sentences; article+noun learning starts immediately.
3. Food/payment and travel; introduce short reusable expressions alongside ordinary words.
4. Appointments, work instructions and basic administrative tasks; add high-utility words even when subtitle frequency is modest.
5. Reasons, events and more precise distinctions; revisit a known spelling with a clearly different sense later.

Due reviews and difficulty repair retain their priority under blueprint §13.1. A pack's sort order must not overwrite scheduling history or cause every example/form to count as a new concept.

## Representative starter fixture: 60 sense entries

`research/content-2026-10/content/starter-pack.json` is the populated research fixture. Planning labels below map to issued UUIDs in `research/content-2026-10/content/id-registry.json`; labels and ordering must never regenerate identity. This fixture deliberately includes a few A2 items and contrasting senses. It is not a promise to introduce all 60 immediately or a claim that all are language-reviewed.

| Ref | Dutch display       | English sense                                    | Polish meaning                                          | Estimated band | Core situation |
| --- | ------------------- | ------------------------------------------------ | ------------------------------------------------------- | -------------- | -------------- |
| S01 | ik                  | I                                                | ja                                                      | A1             | communication  |
| S02 | zijn                | be, linking a person or thing to a description   | być, łączyć osobę lub rzecz z opisem                    | A1             | communication  |
| S03 | goed                | good; satisfactory in quality                    | dobry; zadowalający pod względem jakości                | A1             | communication  |
| S04 | dank u wel          | thank you, polite                                | dziękuję, forma uprzejma                                | A1             | communication  |
| S05 | u                   | you, polite form of address                      | pan, pani lub państwo jako uprzejma forma zwracania się | A1             | communication  |
| S06 | begrijpen           | understand the meaning                           | rozumieć znaczenie                                      | A1             | communication  |
| S07 | niet                | not; negate the statement in this context        | nie; zaprzeczenie zdania w tym kontekście               | A1             | communication  |
| S08 | kunt u dat herhalen | could you repeat that?                           | czy może pan/pani to powtórzyć?                         | A1             | communication  |
| S09 | hebben              | have; possess or have available                  | mieć; posiadać lub mieć do dyspozycji                   | A1             | home           |
| S10 | het huis            | house; building used as a home                   | dom; budynek mieszkalny                                 | A1             | home           |
| S11 | de sleutel          | key for a lock                                   | klucz do zamka                                          | A1             | home           |
| S12 | open                | open; not closed                                 | otwarty; niezamknięty                                   | A1             | home           |
| S13 | de deur             | door                                             | drzwi                                                   | A1             | home           |
| S14 | komen               | come; move towards the relevant place            | przychodzić lub przyjeżdżać do danego miejsca           | A1             | travel         |
| S15 | geen                | no; not any, before a noun phrase                | żaden; nie mieć czegoś, przed frazą rzeczownikową       | A1             | communication  |
| S16 | groot               | big; large in physical size                      | duży pod względem rozmiaru                              | A1             | home           |
| S17 | het water           | water, the substance                             | woda jako substancja                                    | A1             | shopping       |
| S18 | de winkel           | shop                                             | sklep                                                   | A1             | shopping       |
| S19 | kopen               | buy                                              | kupować, kupić                                          | A1             | shopping       |
| S20 | het brood           | bread as food                                    | chleb jako żywność                                      | A1             | shopping       |
| S21 | willen              | want to do something                             | chcieć coś zrobić                                       | A1             | communication  |
| S22 | betalen             | pay                                              | płacić, zapłacić                                        | A1             | shopping       |
| S23 | het geld            | money                                            | pieniądze                                               | A1             | shopping       |
| S24 | duur                | expensive                                        | drogi, o cenie                                          | A1             | shopping       |
| S25 | de rekening         | bill that states the amount to pay               | rachunek do zapłaty                                     | A1             | shopping       |
| S26 | klein               | small in physical size                           | mały pod względem rozmiaru                              | A1             | home           |
| S27 | geen probleem       | no problem; accepting a request or inconvenience | nie ma problemu; przyjęcie prośby lub niedogodności     | A1             | communication  |
| S28 | gaan                | go; move to a destination                        | iść lub jechać do celu                                  | A1             | travel         |
| S29 | de fiets            | bicycle                                          | rower                                                   | A1             | travel         |
| S30 | waar                | where, asking about location                     | gdzie, pytanie o miejsce                                | A1             | travel         |
| S31 | kunnen              | can; be able to do something                     | móc, potrafić coś zrobić                                | A1             | communication  |
| S32 | meenemen            | take along                                       | zabrać ze sobą                                          | A1             | travel         |
| S33 | hoe laat            | at what time?                                    | o której godzinie?                                      | A1             | time           |
| S34 | op tijd             | on time; at the required time                    | na czas, punktualnie                                    | A1             | time           |
| S35 | tot ziens           | goodbye; see you                                 | do widzenia                                             | A1             | communication  |
| S36 | opstaan             | get up out of bed                                | wstawać z łóżka                                         | A1             | home           |
| S37 | het werk            | work; activity done as a job                     | praca, zajęcie zawodowe                                 | A1             | work           |
| S38 | wanneer             | when, asking about time                          | kiedy, pytanie o czas                                   | A1             | time           |
| S39 | de afspraak         | appointment; an arranged meeting                 | umówione spotkanie lub wizyta                           | A1             | health         |
| S40 | een afspraak maken  | make an appointment                              | umówić spotkanie lub wizytę                             | A1             | health         |
| S41 | de huisarts         | GP; family doctor                                | lekarz rodzinny                                         | A1             | health         |
| S42 | ziek                | ill; unwell                                      | chory                                                   | A1             | health         |
| S43 | het spijt me        | I am sorry, expressing an apology                | przepraszam, wyrażając przeprosiny                      | A1             | communication  |
| S44 | de gemeente         | municipality as the local authority              | gmina jako organ administracji lokalnej                 | A2             | services       |
| S45 | het formulier       | form to fill in                                  | formularz do wypełnienia                                | A1             | services       |
| S46 | invullen            | fill in a form or its fields                     | wypełniać, wypełnić formularz lub jego pola             | A1             | services       |
| S47 | maar                | but; linking contrasting statements              | ale; łączy przeciwstawne stwierdzenia                   | A1             | communication  |
| S48 | omdat               | because; introduces a reason                     | ponieważ, bo; wprowadza przyczynę                       | A2             | communication  |
| S49 | de bank             | sofa; couch                                      | kanapa                                                  | A1             | home           |
| S50 | de bank             | bank; financial institution                      | bank jako instytucja finansowa                          | A2             | shopping       |
| S51 | het kind            | child; a young person                            | dziecko jako młoda osoba                                | A1             | social         |
| S52 | het meisje          | girl; young female person                        | dziewczynka, dziewczyna                                 | A1             | social         |
| S53 | pinnen              | pay by debit card                                | płacić kartą debetową                                   | A1             | shopping       |
| S54 | zich inschrijven    | register oneself; enrol                          | zapisać się, zarejestrować się                          | A2             | services       |
| S55 | even                | briefly; for a moment in a request               | na chwilę, na moment, w prośbie                         | A1             | communication  |
| S56 | alsjeblieft         | please, informal request                         | proszę, w nieformalnej prośbie                          | A1             | communication  |
| S57 | alsjeblieft         | here you are, when handing something over        | proszę, gdy coś komuś podajemy                          | A1             | communication  |
| S58 | half drie           | half past two; 2:30                              | wpół do trzeciej; 2:30                                  | A1             | time           |
| S59 | de/het deksel       | lid of a container                               | pokrywka, wieczko pojemnika                             | A2             | home           |
| S60 | slim                | clever; intelligent                              | mądry, bystry                                           | A1             | social         |

Suggested first usable blocks: communication repair (ik, zijn, u, niet, begrijpen plus whole polite formulas); home descriptions (huis, deur, sleutel, open, klein/groot); shopping/payment (winkel, brood, water, geld, kopen, willen, betalen, pinnen); travel/time (gaan, komen, fiets, meenemen, hoe laat, op tijd); appointments/work/services (afspraak, huisarts, formulier, invullen); later contrast/grammar (omdat, gemeente, zich inschrijven, bank senses, deksel variants). Mix two to four targets from different POS rather than exhaust a semantic category. Introduce the second bank or alsjeblieft sense in a later context, not as a simultaneous translation list.

The examples are **fixture contexts**, not an automatically valid chronological course. A sentence can mention another target introduced later in this table. At introduction, supply reviewed support glosses; at independent testing, require the support words/forms and grammar to be known or scaffolded according to the task contract. A declared scaffold is not automatically mastered or free vocabulary. `example-prerequisites.json` records the actual footprint and `scaffold-glossary.json` distinguishes support units from the 60 scheduled sense targets. T43 disables unsupported example tasks rather than inventing an easier sentence at runtime. Past/perfect/subordinate-clause forms in the morphology inventory can be taught later than the headword.

## Frozen coverage baseline and its limits

The cumulative targets remain **600 A1, 1,500 A2, 3,000 B1, 5,000 B2 senses**: incremental additions 600 / 900 / 1,500 / 2,000. They are editorial planning budgets, not official CEFR requirements, not “words needed to pass”, and not empirically proven optima. Compare retention/workload and practical scenario completion before enlarging a band. Do not count every inflection or example as a new concept.

`core-target-candidates.json` freezes 5,000 explicit candidates (3,328 distinct headword strings), with 60 authored pilot senses and source-defined NT2Lex/ODWN candidates. It is a **provisional source-candidate baseline**. Remaining candidates are not fully reviewed for usefulness or CEFR. Rank components and imputations are visible: utility is a legacy-screening proxy or neutral default, and unassigned themes/prerequisites use neutral values. The production selector must replace these with recorded scenario judgments and recompute coverage as it fills blocks; its small implementation slices are in the task drafts. Do not publish this baseline as a ready 5,000-sense course.

Against that frozen baseline, 2,120 candidate senses have some legacy headword match and 2,880 do not. These are **headword-candidate counts**, not confirmed sense coverage: one legacy bank row cannot satisfy every source sense of bank. The missing-candidate CSV gives concrete source definitions for follow-up. 873 legacy lemma strings fall outside this provisional baseline; this does not by itself make them rare or unsuitable.

The 60-entry fixture has 10 headwords/formulas absent as standalone legacy entries: dank u wel, kunt u dat herhalen, geen probleem, hoe laat, op tijd, tot ziens, een afspraak maken, het spijt me, pinnen and half drie. Its sofa sense of bank and handing-over sense of alsjeblieft are also missing from the existing explicit glosses. Dutch-specific service/payment gaps are listed in `priority-gaps.csv`; they can override corpus rank once their sense and usage are sourced/reviewed. A named-service allowlist permits useful DigiD/BSN entries while proper-name noise remains excluded.

## Comparison decisions carried forward

Adopt the other model's emphasis on ODWN's RBN morphology, Apertium corroboration, explicit vocabulary/grammar prerequisites, reflexives, valid article variants and Dutch everyday service vocabulary. Keep the 600/1,500/3,000/5,000 sense budgets as policy; the alternative 600/2,000/3,500/5,000 is a calibration option, not established evidence. Reject unsupported coverage/accuracy percentages, first-attestation-as-CEFR rules, source-majority voting and Pattern-as-truth. See the preserved comparison memo for the exact checked claims.
