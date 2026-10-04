# Pinned replay history

`history.json` retains the production adapter's full transitions for the existing
`../fsrs/sequence.json` learning/review/lapse/relearning trace. Tests also compare
its native cards and logs against the independent pinned spike trace in
`src/infrastructure/fsrs/fixtures/scheduling.json`. Do not regenerate expected
transitions to make a changed interpreter pass.

The replay input is an inspector document, not a new persistence or backup schema.
It uses existing parameter-set and scheduler-envelope records plus the adapter's
retained transition output. `replayVersion: 1` dispatches the pinned ts-fsrs 5.4.2
and `fsrs-interval-cap-v1` interpreter. Unknown versions block the entire replay.

Run `node tools/learning/replay-schedule.ts tests/fixtures/learning/replay/history.json`.
Optional `futureSteps` contain `parameterSetId`, epoch-millisecond `evaluationAt`
and `rating`. Add the new immutable parameter record to `parameterSets` first.
Selecting the original ID in a later future step previews rollback. The report
keeps historical `final` separate from `futurePreviews`; nothing is written.

The API also provides explicit future selection, activation and rollback helpers.
Rebinding the parameter identity for a new transition preserves the native memory
state and historical raw due. Full before/after cards, logs, evaluation instants
and effective cap outputs are compared canonically. Blocked JSON reports retain
the input and contain no replacement schedule; the command exits nonzero.
