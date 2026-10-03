# ADR 0006: Native SQLite plugin for the Android storage spike

- **Status:** accepted for M0; emulator proof is a PR CI gate
- **Date:** 2026-10-02
- **Number:** written as ADR 0004 in parallel with the React shell ADR; renumbered on 2026-10-04

## Context

Android must use native SQLite in its private persistent database directory (A03, A15, I20).
T-005 needs a replaceable Capacitor 8 bridge with real transactions, migration rollback and exact
value round-trips. This is a spike, not W06's final schema or repository API.

## Comparison

Published packages and Android sources were inspected on 2026-10-02. Both projects are maintained,
MIT licensed and accept `@capacitor/core >=8.0.0` in their published peer dependencies.

| Criterion           | `@capacitor-community/sqlite` 8.1.1                                                                                              | `@microbit/capacitor-sqlite-vanilla` 0.1.0                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Maintenance         | Capacitor 8 released 2026-01-20; latest release 2026-08-06 updates SQLCipher to 4.17.0; established community project            | Published 2026-06-18; non-archived foundation repository with maintenance commits through 2026-10-02; README warns of limited use outside one app |
| Capacitor/toolchain | Explicit Capacitor 8 changelog; Java 21, AGP 8.13.0, compile/target SDK 36, minimum 24                                           | Published metadata accepts Capacitor 8; same Java/AGP/SDK versions, although README still says Capacitor 7                                        |
| Transactions        | Explicit `beginTransaction`, `commitTransaction`, `rollbackTransaction`; `run`/`execute` can disable their implicit transactions | Transactional `executeSet`; SQL BEGIN/COMMIT/ROLLBACK possible through `execute`, but no dedicated transaction bridge methods                     |
| Migrations          | `addUpgradeStatement` supported; app can instead transact DDL, data and `PRAGMA user_version`                                    | No upgrade registry; app owns DDL/data and `PRAGMA user_version`                                                                                  |
| Android SQLite      | SQLCipher 4.17.0 even for unencrypted databases; extra Room/security dependencies                                                | AndroidX `sqlite-bundled` 2.6.2; no encryption; bundled SQLite, despite the npm description saying platform-provided                              |
| Supplied ABIs       | arm64-v8a, armeabi-v7a, x86, x86_64                                                                                              | arm64-v8a, armeabi-v7a, x86, x86_64                                                                                                               |
| 16 KB evidence      | Every ELF LOAD segment in the SQLCipher AAR has `p_align = 0x4000`                                                               | Every ELF LOAD segment in the AndroidX Android AAR has `p_align = 0x4000`                                                                         |
| Size                | npm unpacked: 2,034,996 bytes; SQLCipher AAR: 4,007,507 bytes, four uncompressed native libraries total 7,622,448 bytes          | npm unpacked: 81,004 bytes; AndroidX Android AAR: 2,537,459 bytes, four native libraries total 4,944,844 bytes                                    |

These are package/artifact sizes, not APK deltas. Gradle dependencies, compression, resource
shrinking and Play ABI splits change the installed size. The smaller alternative is credible, but
its early release and limited adoption provide less confidence than the established bridge for the
highest-risk M0 spike. The commercial Capawesome plugin was not selected: paid dependencies are
outside this project's scope.

## Decision

Pin **`@capacitor-community/sqlite` to exactly 8.1.1** in `package.json` and the lockfile. Core,
Android and CLI resolve to 8.5.2. Its transitive npm web helper `jeep-sqlite` resolves to 2.8.0
(MIT); it is not initialized or used as an Android fallback. SQLCipher's community distribution
uses its BSD-style license; its bundled cryptographic dependencies retain their own notices.
The new runtime dependency is required by T-005/A15. No storage permissions are requested.

Only `src/infrastructure/db/android/native-bridge.ts` imports the vendor SQLite plugin. The
Android composition root selects it; the web root does not import native storage. A lint rule
rejects plugin imports/re-exports, dynamic imports and CommonJS imports outside
`src/platform/android/` and `src/infrastructure/db/android/`, while allowing Capacitor core/CLI
tooling. Initialization failure is visible and does not select another store.

Serialize operations on each connection. Use the explicit transaction methods and pass
`transaction: false` on every statement inside them. Run app-owned migrations in those same
transactions, updating `user_version` only with the schema/data changes. We deliberately do not
register the plugin upgrade mechanism: its source copies a live database file for rollback,
which needs separate WAL/checkpoint investigation before production use. Foreign keys are enabled
by the native plugin on open; this spike sets a bounded 3-second busy timeout and leaves journal
mode at the plugin default.

## ABI and page-size evidence

The plugin's Android Gradle file pins `net.zetetic:sqlcipher-android:4.17.0@aar`. Inspect its exact
artifact without installing an Android SDK:

```sh
curl -fL https://repo.maven.apache.org/maven2/net/zetetic/sqlcipher-android/4.17.0/sqlcipher-android-4.17.0.aar -o sqlcipher.aar
unzip sqlcipher.aar 'jni/*' -d sqlcipher
readelf -lW sqlcipher/jni/arm64-v8a/libsqlcipher.so
```

Repeat `readelf` for all four ABIs: each LOAD alignment is `0x4000` (16,384). Artifact SHA-256:
`44fc40c33d1de597c8339072a71fa0ff20e12d01ab352d6abe4ad5df668ead94`.
The alternative's `androidx.sqlite:sqlite-bundled-android:2.6.2` AAR SHA-256 is
`156a1fb3a89a18620c5aacc57b340897e5a5d7efed202eda7b0972ddc551a9df`, with the same alignment.

This establishes supplied-library alignment for the Google Play 16 KB page-size requirement.
It does **not** establish final APK ZIP alignment or execution on a 16 KB device. The repository's
AGP 8.13.0 exceeds the 8.5.1 packaging baseline. W49/W50/T75 must inspect the final signed APK/AAB,
verify its packaged native dependencies, and test the declared release ABI/page-size matrix.
The current CI emulator only proves the real x86_64 bridge and storage semantics.

## Sources

- [Community plugin 8.1.1 source and changelog](https://github.com/capacitor-community/sqlite/tree/v8.1.1)
- [Published community package](https://www.npmjs.com/package/@capacitor-community/sqlite/v/8.1.1)
- [Micro:bit plugin](https://github.com/microbit-foundation/capacitor-sqlite-vanilla), inspected at
  commit `d43127ec55d698cf99bf7ec2ba7fd247afdb8ee9`; comparison uses published 0.1.0, not unreleased code
- [Published Micro:bit package](https://www.npmjs.com/package/@microbit/capacitor-sqlite-vanilla/v/0.1.0)
- [SQLCipher 4.17.0 artifact](https://repo.maven.apache.org/maven2/net/zetetic/sqlcipher-android/4.17.0/sqlcipher-android-4.17.0.aar)
- [AndroidX 2.6.2 Android artifact](https://dl.google.com/dl/android/maven2/androidx/sqlite/sqlite-bundled-android/2.6.2/sqlite-bundled-android-2.6.2.aar)
- [Android 16 KB page-size guidance](https://developer.android.com/guide/practices/page-sizes)
