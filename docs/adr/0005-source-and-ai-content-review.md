# ADR 0005: Source-backed facts, exercise rules and sampled AI checks

- **Status:** accepted
- **Date:** 2026-10-03, revised 2026-10-04 (see "History")
- **Decided by:** the owner, who does not speak Dutch and wants language quality handled by AI at a
  cost that scales to thousands of words
- **Supersedes:** blueprint §14.2's human-only language review, and the related wording in §14.3
  and W19 ("human review packets")
- **Preserves:** ADR 0003; no legacy progress migration; no runtime AI or provider dependency
- **References:** W18, W19, W20, W21, F04, F08, T43, T44, T50, T57

## Context

Nobody on the project speaks Dutch, so the blueprint's human `language_reviewed` step can't happen.
The content is authored by AI (OpenAI models) from dictionary sources. Three kinds of error remain
possible:

1. **Wrong facts** (article, plural, verb form, spelling, IPA): preventable by taking every fact
   from a pinned source and checking it automatically.
2. **Systematic authoring errors**: one bad habit of the generator repeated in every entry.
3. **Isolated language errors**: an unnatural sentence or an imprecise translation in one entry.

The first version of this ADR answered 2 and 3 with a full nine-dimension review of every entry by
a model from a different vendor. Its first batch (`research/content-2026-10/review/responses/`,
S01–S10) found **no wrong fact, meaning or translation**. Its five major findings were all one
systematic problem: fill-in-the-blank cues that don't fix the tense and accept a single answer
although synonyms or other tenses are also correct. It took about half an hour of a reviewer
session for ten entries; at the curriculum's 5,000 senses that is hundreds of sessions. Systematic
problems are cheap to find with a sample and fix at the source; isolated errors are best caught
where they show up, while studying.

## Decision

### 1. Facts come from sources, checked by machine

A factual field (article, plural, verb forms, spelling, IPA) is `source_verified` only with a cited
source observation: scope, record locator and pinned hash. Models may choose among evidenced
alternatives but never invent a fact and label it verified. Source disagreements are recorded as
`conflicted` (or adjudicated with the evidence kept), never majority-voted away. Wiktionary
editions and reused frequency corpora are related sources, not independent votes.

### 2. Exercise rules, enforced by the validator

Every generated entry follows these rules, and the entry validator rejects what it can detect:

- **R1 – the cue fixes the answer.** When the answer is a verb form, the cue states tense and
  person (for example "present, ik"). The accepted answers include every common equivalent for that
  cue: synonyms, formal and informal variants, and short forms.
- **R2 – sentences are not graded as one string.** A whole-sentence answer either lists its common
  variants or is self-graded (the learner compares with a model answer and marks it).
- **R3 – no cue gives away or competes with the answer.** A cue gloss doesn't contain a word that is
  itself a valid answer ("possess" invites "bezit").
- **R4 – no placeholders.** No "-" or empty form stored as a form; predicative and attributive forms
  link to the right form record.
- **R5 – learner-facing glosses are clean.** No meta wording such as "in this context" in meanings
  shown to the learner.

When a sample check finds a new systematic problem, it becomes a new rule here and in the
validator, and the generator brief is updated.

### 3. Sampled checks instead of reviewing every entry

Each **generation batch** (any set of entries authored or changed together) gets one **sample
check** by a model from a different vendor than the author; for OpenAI-authored content that is
Claude.

- **Sample:** batches of 20 entries or fewer are checked in full. Larger batches: 10 entries drawn
  with a recorded random seed, plus up to 10 risk entries (several senses or homographs, separable
  or reflexive verbs, de/het alternatives, Polish false friends, fixed expressions, whole-sentence
  production).
- **Three questions** per sampled entry and its examples: is a meaning or translation wrong; is the
  Dutch ungrammatical or unnatural; would an exercise reject a correct answer or accept a wrong
  one. Each sampled entry gets `pass`, `fix` (with a concrete correction) or `unsure`.
- **Batch outcome:** the batch **fails** if any problem shows up in two or more sampled entries
  (systematic: fix the rule or the generator, regenerate or patch the batch, sample again) or if a
  wrong meaning or translation turns up in a risk entry of a kind the rules don't yet cover.
  Otherwise it **passes**: individual `fix` entries are patched, `unsure` entries stay flagged.
- **Evidence:** batch ID, every entry hash in the batch, the seed, the sampled entries and their
  verdicts, the reviewer's vendor and run reference, and the outcome are committed. Nothing is
  fabricated or simulated; the author's self-check never counts.

### 4. Status per entry

| Axis           | Values                                                                       | Set by                        |
| -------------- | ---------------------------------------------------------------------------- | ----------------------------- |
| Origin         | `legacy`, `generated_draft`, `user_private`                                  | import                        |
| Structure      | `unchecked`, `machine_checked`, `invalid`                                    | validator, per payload hash   |
| Facts          | `missing`, `source_verified`, `conflicted`, `not_applicable`                 | source import, per field      |
| Language check | `not_run`, `batch_checked`, `ai_reviewed`, `revision_requested`, `uncertain` | sample-check import           |
| Disposition    | `draft`, `flagged`, `rejected`, `superseded`                                 | check results, reports, edits |
| Release        | `blocked`, `eligible`                                                        | compiler, per task and locale |

- `ai_reviewed`: the entry itself was sampled and passed (or was checked after a fix).
- `batch_checked`: the entry belongs to a batch whose sample check passed, on the hash it had then.
- Any edit changes the hash and returns the entry to `not_run` until a later batch containing it
  passes. A fix batch of 20 entries or fewer is checked in full, so fixes stay cheap.
- `language_reviewed` is not assigned any more.

### 5. Eligibility

The compiler calculates eligibility **per task and locale**: structure `machine_checked`, the facts
that task needs `source_verified` (or `not_applicable`), language check `batch_checked` or
`ai_reviewed` on the current hash, and no open `flagged` disposition. Missing PL, examples or audio
disable only the tasks that need them (T43). Imported drafts can't grant themselves any check or
release status (T50). Explicitly opted-in private study stays separate from curated packs.

### 6. Problem reports close the loop

Learners can report a problem with any word from the app. Reports are stored locally with the
entry ID and hash and can be exported; the owner hands them to the content workflow, where fixes
form a small fix batch (section 3). A reported entry stays usable unless the reporter hides it;
reports never change content by themselves.

## Consequences

- Cost scales with the number of batches, not entries: one short session per batch.
- Unsampled entries in a passing batch are **not individually checked**. The app says so where it
  matters ("not individually reviewed"), and reports catch what slips through. A sample of 10 with
  no error does not prove the error rate is low (the exact one-sided 95% bound is about 26%); the
  rules, the source checks and the risk sample carry most of the load.
- Vendor diversity reduces one kind of shared blind spot; it does not make a model a Dutch expert.
- The starter pilot (S01–S60) is first brought in line with R1–R5, then checked once as a batch.
  Batch 01 of the old full review stays as evidence and seeded the rules; batches 02–06 are not
  run.

## History

- 2026-10-03: accepted with a full nine-dimension review of every entry by a different vendor.
- 2026-10-04: after batch 01 (above), replaced by exercise rules, sampled batch checks and in-app
  reports. The source-fact policy is unchanged.
