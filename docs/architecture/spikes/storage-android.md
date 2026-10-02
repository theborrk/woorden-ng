# Native Android SQLite spike (T-005)

## Boundary and versions

The Android target opens `woorden_spike_startup` through `@capacitor-community/sqlite` **8.1.1**,
with Capacitor core/Android/CLI **8.5.2** and native SQLCipher **4.17.0**. See
[ADR 0004](../../adr/0004-native-sqlite-plugin.md) for alternatives, license, size, ABI and 16 KB
evidence. This is an isolated M0 schema; W06 must choose the final database name and schema.

T-004 is still `todo` in this baseline, so there is no existing web schema or contract suite to
reuse. This spike follows its planned `events`, `taskProgress` and `projectionMeta` tables:

- `events`: non-null primary ID, unique nullable `commitKey`, integer milliseconds, canonical JSON
  stored as TEXT. Non-attempt events bind **SQL NULL**, not an empty string.
- `taskProgress`: compound `(profileId, taskId)` primary key, revision CHECK, eligibility index
  `(profileId, eligibleAt, taskId)` and parameterized UPSERT.
- `projectionMeta`: a watermark referencing the committed event.
- Version 2 adds `activation = 'active'` and increments existing progress revisions. This is
  deliberately a test migration, not a learning policy.

The normal Android startup opens/migrates only the empty spike database. It rejects missing native
support, open failures and newer schemas; the shell shows an alert stating that data cannot be
saved and the app should be restarted to retry. The PWA has no dependency on this capability. No
IndexedDB, Preferences, cache-directory or in-memory durability fallback exists.

## Executable checks and findings

`npm run test:repositories:android` selects **only** `@repositories` tests in
`e2e-android/storage.spec.ts`. `npm run test:e2e:android` excludes them. The existing CI device
runner invokes both scripts independently against the debug APK, on native/storage PRs and releases.

The Playwright `app` fixture launches the real installed APK with cleared data and attaches to
its WebView. The tests call the adapter in that WebView; no SQL runs in the Node runner or a desktop
browser. Each restart force-stops the app and uses `launchApp(device, { clearData: false })`.
Commit/rollback tests intentionally leave the connection open before process termination.

| Criterion | Device test and assertion                                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1       | `native multi-table commit survives an app restart`: event, progress and watermark are exact before and after restart                                                                                   |
| AC2       | `native failure after the first write rolls back across restart`: real CHECK failure on the second SQL write leaves every table equal to its previous snapshot, including after restart                 |
| AC3       | `SQL NULL commit keys coexist and duplicate non-NULL keys fail`: 20 NULL rows plus one keyed row coexist; a second keyed event fails a real UNIQUE constraint and changes no table                      |
| AC4       | `opening version 2 migrates version 1 data durably`: schema version, migrated revision/activation and preserved event/watermark survive restart                                                         |
| AC4       | `a failed version 2 migration preserves version 1 schema and data`: native SQL failure after ALTER/UPDATE restores all columns, data and user_version; restart and a subsequent successful upgrade work |
| AC5       | `millisecond integers and canonical JSON round-trip unchanged`: negative/zero/current/max-safe integers and UTF-8 JSON with escaping survive exact comparison and restart                               |

The test handle is `window.__storageSpike`. Capacitor 8.5.2's Android `JSExport.getGlobalJS`
sets `window.Capacitor.DEBUG` from `ApplicationInfo.FLAG_DEBUGGABLE`. Only when it is exactly
`true` on Android does the composition root dynamically import and expose the harness. Device
tests assert that flag and wait for the handle; missing native support fails startup before it
is exposed. Release APKs do not expose the handle, although the build contains the unreachable
harness chunk. Unit tests prove the true/false/absent cases.

Local validation covers native unavailability/open rejection and its visible alert, the debug
guard, per-statement transaction flags, lint boundaries, TypeScript, both web/native bundles and
the existing web e2e flow. **The implementing environment has no Android SDK and does not run the
device suite.** Native behavior is an executable CI hypothesis until the PR emulator job passes;
unit mocks are not native proof. Consult the CI summary/log tail and `device-screenshots` artifact
for failures.

Local `npm run verify` passes (44 unit tests), and `npm run test:e2e:web` passes (3 tests).
The matching Playwright browser download was denied by the environment's HTTP domain policy.
The preinstalled Chromium 151 incorrectly reset `navigator.onLine` after an offline service-worker
reload. Validation therefore used the supported `PW_CHROMIUM_PATH` fallback with Chromium
153.0.8010.0 from `@sparticuz/chromium` 153.0.0, installed outside the repository; no project
dependency or test was changed for that fallback. CI continues to use Playwright's own browser.

Source inspection establishes these adapter requirements:

- Explicit begin/commit/rollback methods operate on the same native database connection.
  `run` and `execute` default to their own transactions, so the bridge always disables those;
  otherwise nested transactions or individual commits would violate the unit of work.
- Android's low-level `query` method requires an explicit `values` array even for parameterless
  SELECT/PRAGMA statements. The bridge sends `values: []`; the unit mock enforces this native
  contract. Omitting it prevented startup and all repository tests in the first PR CI run.
- Queue reads, writes and close operations on that connection so concurrent callers cannot
  interleave a transaction. Return an operation's rejection to its caller while keeping the queue
  usable for subsequent operations.
- Migrate DDL, data and `PRAGMA user_version` together in an explicit transaction. Failure rolls
  back and closes the failed handle; never delete/reset the database to make opening succeed.
- SQLite permits multiple NULLs in the unique index; native JSON uses SQL NULL values and reads
  INTEGER values via Java `getLong`. The device suite checks the bridge, not just SQL theory.

## What W06 and W47 must handle

- Replace this disposable schema with validated shared logical contracts and independent native
  schema versions. Reuse T-004's command fixtures once available to prove I19/T61 equivalence,
  including compound-key upserts, ordering, revisions, hashes and all final tables.
- Own one serialized connection per authoritative database and enforce transaction-scoped
  operations. Prepare non-database work before entering it; add revision/base-hash checks and
  duplicate/recovery behavior. Bound busy handling before commit and never blindly replay a grade.
- Preserve data on open/migration errors, present the full recovery/retry/export UI, handle newer
  schemas and rollback APKs, and exercise native process death during transactions/migrations.
  This spike covers a failed statement and force-stop after acknowledgement, not mid-commit death.
- Define lifecycle/close/reopen ownership, WAL/checkpoint policy, disk-full diagnostics, and
  interrupted operations. This spike leaves journal mode at the plugin default and uses
  `busy_timeout = 3000`; it does not copy a live database as a backup.
- Keep portable backups logical and use durable app-private native files for personal media.
  Explicitly exclude private DB/files from automatic cloud backup where supported and verify
  transfer behavior. Native file access and the backup rules are later W47 work.
- Validate final APK/AAB packaging and real ABI/page-size compatibility in W49/W50/T75; the ELF
  alignment audit is not the signed-release compatibility matrix.
