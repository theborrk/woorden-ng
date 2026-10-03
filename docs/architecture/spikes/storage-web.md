# Web storage spike (T-004)

## Versions and execution

- Node 24.21.0, Dexie **4.2.1** (exact runtime dependency), fake-indexeddb **6.2.5**
  (exact development dependency), Vitest 5.0.3. Resolved versions are in `package-lock.json`.
- Both new dependencies use Apache-2.0. Dexie is required by A03 and this task; its distributed
  `dist/dexie.min.js` is 95,850 bytes, or 30,349 bytes with `gzip -n -9`. This is a reference size,
  not a measurement of the eventual tree-shaken application bundle. The spike is not imported by
  either composition root, so it adds no code to the current shipped bundles. fake-indexeddb is
  test-only and does not ship.
- Run `npm run test:repositories:web`. The existing CI verify job discovers this script (ADR 0002);
  no workflow change is needed. The existing unit-test glob also includes these integration tests.
- The suite runs in Vitest's Node environment with an injected, isolated `IDBFactory` per case. It
  exercises the actual pinned Dexie implementation against fake-indexeddb, not a mocked Dexie API.
  These results establish API and transaction semantics in that harness; they do not establish
  browser quota/eviction, process-crash recovery, multi-tab behavior or SQLite behavior.

## Experimental schema

[`SpikeDatabase`](../../../src/infrastructure/db/web/spike.ts) is an isolated experiment, not the
W06 schema, repositories or `LearningUnitOfWork`. No production UI or storage path uses it.

| Store            | Version 1 keys/indexes                               | Version 2 change                   |
| ---------------- | ---------------------------------------------------- | ---------------------------------- |
| `events`         | `id` primary key; unique optional `commitKey`        | Unchanged; events remain immutable |
| `taskProgress`   | `[profileId+taskId]` primary key; `eligibleAt` index | Add `[profileId+eligibleAt]` index |
| `projectionMeta` | `id` primary key                                     | Unchanged schema                   |

The version 2 upgrade updates `projectionVersion` to 2 in both progress and watermark rows. This
small illustrative data migration preserves event payloads, revisions, timestamps and canonical
JSON. Its injected failure runs after both collections have been modified, inside the upgrade
transaction. Schema versions and projection versions are distinct even though this fixture uses
the same numbers. No booleans, JSON objects or optional objects are indexed.

## Findings and evidence

All cases are plain commands, input rows and expected results in
[`storage-cases.ts`](../../../tests/integration/repositories/storage-cases.ts). The
[`web driver`](../../../tests/integration/repositories/web-driver.ts) alone depends on Dexie and
fake-indexeddb; [`web.test.ts`](../../../tests/integration/repositories/web.test.ts) supplies Vitest
assertions and cleanup. The exported driver interface is a test harness, not a production unit of
work. Each read-after-reopen closes and reopens the same database without deleting its data.

| Criterion | Observation                                                                                                                                                                                                                                                                                                                            | Contract case titles                                                                                                                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1       | One awaited `rw` transaction commits an event, progress and watermark together. Throwing after all writes rolls back inserts; an additional case proves existing progress and watermark values are restored. Reads after reopen see only committed values.                                                                             | `AC1: a multi-store transaction commits every row and survives reopen`; `AC1: throwing after all three writes rolls back every row`; `AC1: rollback restores existing progress and watermark as well as removing the event` |
| AC2       | Sixteen non-attempt rows with the `commitKey` property absent coexist with an attempt. A different event ID with the same commit key raises `ConstraintError` and rolls back preceding writes in the transaction. Duplicate primary IDs also raise `ConstraintError`. Strict row equality checks that absent properties remain absent. | `AC2: absent commit keys coexist; duplicate commit keys abort the entire transaction`; `AC2: duplicate event IDs are rejected even when commitKey is absent`                                                                |
| AC3       | Two `put` calls for one compound key leave one row with the newer revision. The indexed `belowOrEqual` query includes its boundary, excludes the future row, and orders ascending by timestamp, then compound primary key for ties, independent of insertion order and reopen.                                                         | `AC3: compound-key puts replace one row with the latest revision`; `AC3: eligibility index orders by timestamp then compound primary key, including ties`                                                                   |
| AC4       | Opening seeded version 1 as version 2 migrates both projections and preserves events. A throw after both modifications rejects open; reopening version 1 reads its original version and unchanged data. Retrying version 2 succeeds.                                                                                                   | `AC4: version 2 upgrades version 1 projections and preserves immutable events`; `AC4: failed upgrade restores the version and both migrated stores; retry succeeds`                                                         |
| AC5       | Integer instants `-1`, `0`, `1791000000123` and `Number.MAX_SAFE_INTEGER` survive in events and progress exactly. Canonical JSON text containing nested objects, arrays, null, booleans, numbers, empty strings, Unicode and escaped newline/quote characters survives byte-for-byte. No date coercion or JSON reserialization occurs. | `AC5: millisecond instants and canonical JSON round-trip unchanged after reopen`                                                                                                                                            |
| AC6       | The dedicated npm script runs all ten cases, and the existing CI script-discovery loop enables the repository gate.                                                                                                                                                                                                                    | `npm run test:repositories:web`; this document and the existing CI workflow reviewed                                                                                                                                        |

`commitKey` must be **absent** on non-attempt web rows. An empty string is a valid IndexedDB key and
would enter the unique index; it is not a missing-key sentinel. Although null is not a valid
IndexedDB key, it is not the logical web representation either. The spike event union and strict
fixtures require absence; native rows must use SQL NULL and normalize it to absence when returning
the logical row. No nullable/empty-key workaround belongs in the web adapter.

## Handoff to T-005 and W06

T-005 landed independently before this PR was rebased onto the current baseline. Its native spike
already covers these three logical stores, but uses different row fields and an illustrative v2
migration that adds activation and increments revision. W06 must align the logical fixture shape
and migration expectations before replaying this contract through the native bridge. This PR does
not change the native spike or claim that these ten cases already run on Android.

- Replay the same `storageCases` data from a native device test runner with a driver backed by the
  real SQLite bridge. Map compound IDs to a composite primary key, absent commit keys to SQL NULL,
  and normalize native duplicate-key errors to the contract's `ConstraintError`. Keep injected
  transaction and upgrade failures at the same points. Do not run the native contract against
  fake-indexeddb or an in-memory JavaScript SQLite substitute.
- Native query ordering must be explicit: timestamp, profile ID, task ID, with deterministic
  collation. These fixtures use ASCII identifiers; W06 must define matching key ordering for every
  supported identifier. Reading canonical JSON must return the original text; store integer
  millisecond values without second conversion or rounding.
- W06 must prepare scheduler inputs before entering a real transaction, recheck revisions/base
  hashes inside it, append events with `add` rather than an overwrite, and acknowledge success only
  after the transaction promise resolves. Within Dexie callbacks, await only that transaction's
  database work. These tests deliberately use no network, timers, audio or unrelated promises;
  they do not establish that unrelated asynchronous work can keep an IndexedDB transaction alive.
- Extend the three-store experiment to the final schema and transaction-scoped repositories,
  outbox/counter atomicity, shared logical format version and independent physical schema versions.
  Define canonical serialization and validation before hashing; this spike only preserves
  already-canonical JSON text. Validate external data and do not index raw booleans/objects.
- Surface failed writes/upgrades with retry and recovery/export paths, preserve drafts, and never
  delete user data or silently downgrade/fall back. Browser eviction/quota failures, blocked
  upgrades, old-client recovery and crash interruption need later browser/device tests; multi-tab
  coordination remains W13. Native restart durability is T-005's device-test responsibility.
