# Prepared learning writes

`prepareWrite` validates T-123 runtime records, checks the supplied scheduler before/after and
eligibility against the prepared event, computes canonical bytes and SHA-256 hashes, and freezes
and brands the result. It does not classify an answer or compute FSRS. Pass the complete current
`TaskProgress` (or `null` for a new task) and its parent scheduling transition ID. Attempts use the
hash of that canonical progress record as `expectedStateHash`; an absent base hashes UTF-8 `null`.
The same hash implementation must be used for preparation and the command service.

`createPersistenceService(new WebLearningUnitOfWork(database)).commit(write)` rechecks the base
revision, stored canonical hash and parent inside one real Dexie transaction. The result is
`saved`, `duplicate`, or `conflict`; a transaction failure rejects the promise and never reports
saved. Retries must retain the same event and prepared after-images. Changed content under an
existing event ID is an integrity conflict, even if only an after-image changed. Commit keys are
optional for exposure/help, and unique per profile when present. Drafts survive rejected writes.

All event, projection, head, local outbox, retained after-image journal, summary and checkpoint
writes share that transaction. Hashing and other asynchronous preparation finish before transaction
entry. Repository callbacks may only await transaction operations; handles reject after the
callback ends. The profile database upgrades its physical web schema from 1 to 2 without changing
logical format 1 or existing profiles/preferences.

`inspect(profileId)` exposes durable canonical rows, counters, watermark, outbox and checkpoint.
`eligible(profileId, through)` uses the profile/eligibility index and sorts ties by task ID. Events
use timestamp, device ID, device sequence and event ID order, with ordinal string comparisons.
The local outbox contains canonical pending events; no sync transport is implemented.

Projection version 1 retains validated after-images alongside each event. `rebuild(profileId)`
reduces those journals in deterministic event order, choosing the highest revision and event order
for each projected key. It restores summary/checkpoint and affected rows without changing events,
outbox or independently saved drafts, and without invoking a scheduler or hash provider. Missing
or unsupported retained journals reject and roll back the rebuild. This is projection repair;
full undo/replay semantics belong to W13. Call rebuild when inspect reports a stale version;
commits reject stale projections until repair completes.

Overrides lack a T-123 domain contract. This boundary accepts only a closed, versioned
`user_override` envelope (`id`, `profileId`, `revision`, `valueJson`) whose payload is valid opaque
JSON. Future override features own payload semantics; persistence does not interpret or render it.
No new runtime dependency or native adapter is introduced. The integration fixtures are portable
validated records for the future native driver; their scheduling snapshots are supplied fixture
results, never production scheduling policy.
