# External practice contracts (W51)

These provider-neutral V1 contracts prepare the boundary in blueprint §20.2. They are not a tutor
integration or an observation importer. No network, provider configuration, storage, UI, or scheduler
is needed. The companion voice-tutor design is absent; §20.2 is authoritative for this task.

## Inspect files directly

Use Node 24 (the repository toolchain), from the repository root:

```sh
node tools/contracts/inspect-external-practice.ts session tests/fixtures/external-practice/lesson.json
node tools/contracts/inspect-external-practice.ts observation tests/fixtures/external-practice/observation.json
node tools/contracts/inspect-external-practice.ts observation tests/fixtures/external-practice/observation.json tests/fixtures/external-practice/observation.json
node tools/contracts/inspect-external-practice.ts observation tests/fixtures/external-practice/observation.json tests/fixtures/external-practice/observation-conflict.json
```

Success prints a JSON object with `valid: true` and the entire validated value. Observation inspection
also prints `new`, `identical`, or `conflict`, `gradingEligible: false`, and the I23 exclusion reason.
Conflicts are valid claims requiring future reconciliation, so inspection exits successfully; they
are never permission to overwrite an earlier claim. Invalid input, unreadable files, malformed JSON,
and incorrect invocation print `valid: false` with an error to stderr and exit 1.

## V1 data shape

`TutorSessionPackageV1Schema.parse(unknown)` and `ExternalPracticeObservationV1Schema.parse(unknown)`
return their exported TypeScript types or throw a field-path error. Every listed field is required;
unknown fields are rejected recursively rather than silently stripped. Both use `schemaVersion: 1`
and distinct `kind` discriminators. No unknown metadata bag permits hidden scheduling state.

A session package has:

- `kind: tutor_session_package`, opaque `sessionId` and `profileId`, `createdAt` (epoch milliseconds),
  and a nonempty `contentRevision`.
- Independent EN/PL `preferences`: `interfaceLocale`, `explanationLocale`, and `cueLocale`.
- A nonempty `lessons` array. Each lesson has stable `senseId` and `taskId`, EN/PL `explanation`,
  `supports`, `cuePolicy`, and `helpPolicy`.
- Each support has a stable `id`, an assistance `kind`, EN/PL `explanation`, `origin`,
  `reviewStatus`, and `selected`. Empty supports are valid; support is optional for the learner.
- `cuePolicy` identifies the primary `family`, EN/PL `locale`, bilingual `primaryCue`, and whether
  replay of that primary cue is allowed. Additional assistance is separate from the intended cue.
- `helpPolicy` has a positive integer `version` and an ordered `graduatedHints` array. Each hint has
  an opaque `id`, assistance `kind`, and EN/PL `explanation`. Array order is the permissible progression;
  an empty progression is valid for a task without hints.

An observation has:

- `kind: external_practice_observation`, a unique opaque `id`, stable `sessionId`, `profileId`,
  `senseId`, `taskId`, `contentRevision`, and `occurredAt` (epoch milliseconds).
- `reportingSource` with a nonempty `id` and `kind` (`learner_report` or `external_tutor_report`).
  This is attribution of a claim, not authentication or proof that the app observed a response.
- `reportedOutcome`: `correct`, `incorrect`, `omitted`, or `ungradable`. It is never an FSRS rating.
- `helpUsed: { status: unknown }`, or `{ status: known, assistance: [...] }` with each reported
  assistance's `kind` and `shownAt`. Known empty assistance means explicitly reported no help;
  missing help information is invalid and cannot silently mean unaided.
- Positive integer `payloadVersion` and `payloadHash` in `sha256:<64 lowercase hex digits>` form.

IDs are nonempty opaque strings supplied by the caller. This boundary neither derives IDs from text
nor assigns them or consults a registry. Their immutability, existence, ownership, and relationships
must be checked by the future application boundary against its catalog/session data (T-110 owns the
content registry). Timestamps are nonnegative safe integer epoch milliseconds within the Date range.
Structural validation does not prove chronology, source trust, language review, or content correctness.

## Duplicate semantics and hash boundary

`classifyDuplicate(validatedObservation, validatedPreviousObservations)` is pure and makes no writes.
A new ID is `new`. The same ID/hash is `identical` (idempotent). The same ID with a different hash is
`conflict`; any conflicting previous value wins over an identical one in a mixed input history.

V1 checks the declared hash's syntax and compares it; it does not recompute or authenticate it.
The future import boundary must define a canonical payload encoding, recompute the digest with the
hash field excluded, and bind it to the payload version before using duplicate classification for
persistence. The inspector is a structural contract tool, not a trusted import decision. The fixtures
use synthetic hash labels to exercise identity/conflict semantics and contain no personal data.

## Future query/export and observation-import boundary

A future application query may export selected lesson context into this package after checking local
profile/session ownership, catalog revision and target IDs, independent language preferences, chosen
supports, primary cues and permissible help. It must preserve these identities and context, and must
not expose scheduler snapshots or credentials. This task implements no query service or transport.

A separately commissioned observation-import command must validate the closed observation schema,
verify source/ownership, version/hash, target/session relationships and content revision, and reconcile
duplicates before recording a distinct external claim. Conflicts must remain explicit. Unknown help
must remain unknown. A separately validated policy may later use such claims to suggest follow-up
practice; the app's own subsequent attempt supplies any app-observed grading evidence.

**I23:** This boundary cannot call `CommitAttempt`, deserialize a claim as `AttemptCommitted`, write
progress, or accept supplied FSRS state. `attempt_committed`, scheduling snapshots, ratings, commit
keys and state hashes are rejected. An externally reported correct result, even with known no help,
never advances FSRS directly. No persistence/import UI or actual follow-up policy is included here.

## Fixture and test evidence

The lesson fixture represents the current blueprint lesson structure: separate PL/EN explanations,
selected mnemonic context, translation cue, and graduated sound/letter/answer hints. Its assigned
UUIDs are fixed fixture identities, not additions to the production registry. Text is explicitly
`unreviewed`; it is test content, not a published lesson or a claim of language review.

`src/contracts/external-practice/schemas.test.ts` proves T73/I23 validation and duplicate behavior.
`tests/integration/external-practice/inspector.test.ts` runs the real inspector in Node with an empty
child environment, proving complete lesson preservation, explicit grading exclusion, duplicate output,
and failure for missing identity/time/version/source fields without any provider configuration.
