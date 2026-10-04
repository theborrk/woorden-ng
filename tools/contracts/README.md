# Runtime record inspector

With Node 24, run from the repository root:

```sh
node tools/contracts/inspect-runtime.ts tests/fixtures/runtime/profile.json tests/fixtures/runtime/event.json
```

Each file contains one record. The inspector emits one JSON line with the record kind, identity,
canonical JSON string and lowercase SHA-256 of its canonical UTF-8 bytes. Composite records retain
their profile/task or profile/sense keys in the canonical payload; a standalone scheduler envelope
reports its parameter-set ID. Invalid files report a field path on stderr and make the overall exit
code 1, even if other files succeed. No arguments, unreadable files and malformed JSON also fail.

The shared logical `formatVersion` and each entity/context/serialization version currently accept
only 1. Native scheduler cards use the numeric states and explicit ISO UTC date strings serialized
by ts-fsrs 5.4.2. Native due, integer interval and phase must agree with their envelope. This
boundary does not calculate schedules, grades or eligibility, or validate repository references.

Canonical rules: recursively sort object keys by UTF-16 code units (never locale sorting), preserve
array order, use JSON number/string encoding, and preserve Unicode text without normalization.
Encode as UTF-8 without a BOM or trailing newline; hash with SHA-256. Optional absent fields stay
absent, and nullable fields keep null. Unknown fields fail rather than disappearing. The committed
canonical golden fixtures were independently encoded and hashed with Python's sorted JSON and
SHA-256 for the representative records, and checked by unit and Node process tests.

Content references reuse the existing opaque UUIDs in the content registry. Inspection never
allocates IDs. New runtime records can use `allocateIdentity` with injected UUID/time suppliers.
Preferences keep interface locale and cue locale separate. Events/drafts retain a versioned prompt
and answer display snapshot, content and grading references, so a removed pack does not erase
historical context. These fixture snapshots are test data, not reviewed language content.

Only `attempt_committed` carries `commitKey`, exactly `profileId:attemptId`; assistance and exposure
can share the attempt ID without participating in that index. External claim kinds, provider fields
and external judgment sources are rejected. This is a closed data contract, not authentication of
the author of an otherwise valid file. Events are returned as frozen copies, including nested data.
