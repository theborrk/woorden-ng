# Declared attempt scoring (T-144)

Run the inspector directly with Node 24; it takes one JSON trial per file:

```sh
node tools/learning/inspect-scoring.ts trial.json another-trial.json
```

The input fields and representative cases are in
`tests/fixtures/learning/scoring/matrix.ts`. Use the baseline as a JSON trial (omit its undefined
`responseDurationMs`); `primaryCue` declares text, a referent image or audio. Required image/audio
must be available. A replay counts as a primary cue only when the audio contract permits it.
Components describe the **initial** response, and `targetComponent` selects the objective being
graded. A productive form can be correct with separately recorded article/spelling errors.

`promptAt`, `responseLockedAt` and each support's `shownAt` are injected integer milliseconds.
The first response must be locked before feedback; help at the same instant as the lock counts
conservatively as prior assistance. Pre-response hints/reveals prevent independent success.
Post-lock feedback/support is subsequent exposure and cannot erase the first response.
An incorrect first response remains incorrect after a successful retry. Assisted correct answers
without an earlier independent failure are classified as omitted independent recall.

Each result retains declared/effective initial outcome, final outcome, components, judgment source,
assistance and later exposures. `proposedRatings` contains zero or one rating; the inspector never
calls FSRS or saves events. Good requires independent initial success, Hard additionally requires
declared effort, and Easy requires advanced mode and an explicit choice. Declared effort takes
precedence over Easy. Response duration never selects a grade.

Malformed/contradictory inputs, unsupported modes/judgments, invalid prompts, missing required
media, valid alternatives and ungradable trials have no rating. Unexpected exposure requires
practice. Early trials, learning/extra practice and standalone probes never schedule; a correct
practice response can still be independently produced, without establishing later-day evidence.
Recognition is outside this recall classifier. Spoken/thought/recorded self-report stays labelled
self-report; automatic speech judgment is unsupported and `verifiedSpeech` is always false.

Stdout contains one JSON result per readable trial. Invalid shape/lifecycle data sets exit status 1
with field-specific issues and no rating; unsupported but structurally valid trials are successful
inspections with an explanatory no-rating reason. Missing/unreadable/malformed files report stderr
and exit 1 while remaining files are inspected. Inputs stay unchanged. Persisted attempt lifecycle,
real media tasks and typed matching remain separate tasks.

## Exposure gates and delayed evidence (T-146)

```sh
node tools/learning/inspect-evidence.ts tests/fixtures/learning/evidence/recap.json
```

The inspector aggregates relevant exposure, projects the existing T-143 eligibility gates, and
reports per-task/cue-family recall evidence with actual gaps and uncertainty. See
[`tests/fixtures/learning/evidence/README.md`](../../tests/fixtures/learning/evidence/README.md)
for the diagnostic envelope, retained historical labels, primary-replay exception and versioned
policy. Eligibility after a ten-minute Review exposure gate remains distinct from six-hour delayed
recall. Input files, scheduler state and content are never written.

## Typed answer inspection

Run `node tools/learning/inspect-answer.ts tests/fixtures/learning/answers/house.json`.
The pure evaluator uses explicit sense/example/form contracts, keeps lexical,
meaning, article and spelling results separate, and never accepts a typo
suggestion as target success. The command validates T-110 entries and checks
the selected contract's links/answers; all included fixtures remain synthetic
inspector inputs. See `tests/fixtures/learning/answers/README.md`.
