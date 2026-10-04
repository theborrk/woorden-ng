# Exposure and evidence diagnostics (T-146)

Run the committed synthetic recap case with Node 24:

```sh
node tools/learning/inspect-evidence.ts tests/fixtures/learning/evidence/recap.json
```

The file has two objects: `eligibility` uses T-143's existing projection contract, and `evidence`
uses diagnostic version 1 from `src/domain/learning-evidence/project.ts`. These are read-only
inspection inputs, not a new persisted event schema. A later adapter can supply T-123 records.

All history times are injected integer UTC milliseconds. Study dates are retained historical
labels, not recalculated in the device's current timezone. The caller declares whether exposure
history from introduction is complete; unknown introduction uses null for both instant and day.
An incomplete log yields null `cleanGapMs`, an explicit uncertainty and no delayed label.
`observedGapMs` reports time since the latest known exposure even when history is incomplete;
it does not prove a clean gap. No clock or storage is read.

Exposures target sense IDs and retain their reason, resource, originating task/attempt and phase.
Teaching, word detail, recap and other relevant exposures affect answer-sharing tasks, including
other cue families for the same sense. Unrelated senses are excluded. Primary audio replay is
exempt only for the observed audio task with an explicit allowed-replay contract and the matching
current or historical attempt, between prompt and lock. It remains exposure for other tasks.
Feedback must follow the locked response and affects later gaps, never the earlier initial result.
Help at the lock counts conservatively as prior assistance.

Attempts are declared initial outcomes, validity, eligibility, assistance, mode, judgment source,
and exact task/cue family/locale. They are evidence inputs, not grades or new scheduler transitions.
Only valid eligible scheduled independent initial success, on a later day than introduction and
latest relevant exposure, with at least six elapsed hours qualifies. One qualifying day gives
`later_recall_observed`; two distinct days give `maintaining`. Repeated successes in one day
cannot satisfy this requirement. Self-report remains labelled as self-report. Missing history,
assistance, short gaps, same-day and practice/probe attempts do not invent delayed evidence.

Defaults are one-minute new/learning/relearning exposure gates, ten-minute Review exposure gates,
a six-hour delayed-evidence threshold, and a needs-support suggestion after three consecutive
eligible failures across at least two sessions. An independent success clears that failure streak.
All four settings can be supplied together in `policy`; the output records the resolved values
and `evidence-v1-six-hour-later-days`. These are transparent product rules, not proof of mastery.
T-143 combines the derived exposure gate with every other gate, retaining raw engine due unchanged.
A valid routine review after ten minutes does not qualify as six-hour delayed evidence.

Stdout is one JSON report per valid file. Errors go to stderr, set exit status 1 and preserve
input files; later files are still inspected. Unsupported versions, unknown fields, duplicate IDs,
future/contradictory chronology and invalid policy values fail closed. No dashboard, scheduler
transition, persisted event, content status or inherited mastery is created.
