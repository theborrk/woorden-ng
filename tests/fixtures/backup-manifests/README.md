# Proposed portable inventories

Inspect without opening an archive (Node 24, no extra dependencies):

```sh
node tools/contracts/inspect-backup.ts < tests/fixtures/backup-manifests/full.json
node tools/contracts/inspect-backup.ts < tests/fixtures/backup-manifests/progress-only.json
```

The contract is `src/contracts/backup/manifest.ts`. These are synthetic inventories, not archives;
media sizes and hashes are example metadata. A supported report proves inventory structure only,
not file presence, digest correctness, event validity or restore safety.

`formatVersion: 2` versions `.woorden.zip`; `logicalVersion: 1` versions the logical inventory;
`schemaVersions` separately identifies database and content schema compatibility. `appVersion` is
informational. Export instants use canonical UTC milliseconds. The watermark is a per-source-device
inclusive sequence frontier (an empty array means no history), not a new installation identity.
Multiple revisions of one pack may be retained to interpret history. Arrays report in ordinal order.

Full backups require every declared personal media item. Bundled media inclusion follows
`includeBundled`. Progress-only backups omit all media and report both download requirements and
unrecoverable personal media. Included media must have matching file metadata; omitted media must
have none. Every media file must have an included reference. SHA-256 uses 64 lowercase hex digits;
sizes are nonnegative safe integers in bytes. Paths use a portable ASCII subset, exclude traversal,
absolute paths, encoding, Windows device names and case aliases, and reserve `manifest.json` for
the manifest itself. Its own hash is not inventoried.

Portable settings allow only UI and translation language (`en`/`pl`), timezone preference,
study-day boundary hour (0–23), nonnegative daily-new preference and autoplay. Every other setting
is rejected, including installation identity/sequence, physical paths, connection state,
permissions and notification OS IDs. Historical `eventWatermark.deviceId` references remain valid.
The inventory does not inspect settings/event file bodies; those validators belong to later tasks.
