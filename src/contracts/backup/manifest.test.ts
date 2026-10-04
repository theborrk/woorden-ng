import { describe, expect, it } from 'vitest';
import full from '../../../tests/fixtures/backup-manifests/full.json';
import progress from '../../../tests/fixtures/backup-manifests/progress-only.json';
import {
  inspectManifest,
  InventoryError,
  validateManifest,
  validatePortableSettings,
} from './manifest.ts';

it('W09: AC1 full inventory reports supported versions, history, retained revisions and media deterministically', () => {
  const result = inspectManifest(full);
  expect(result).toEqual({
    compatibility: 'supported',
    verification: 'inventory-only',
    format: 'woorden.zip',
    formatVersion: 2,
    logicalVersion: 1,
    schemaVersions: { database: 1, content: 1 },
    appVersion: '0.0.0',
    exportedAt: '2026-10-03T12:00:00.000Z',
    profileIds: ['profile-example'],
    eventWatermark: [
      { deviceId: 'historical-device-a', sequence: 42 },
      { deviceId: 'historical-device-b', sequence: 12 },
    ],
    retainedContentRevisions: [
      { packId: 'starter', revision: '2026-10-01' },
      { packId: 'starter', revision: '2026-10-02' },
    ],
    mediaPolicy: { mode: 'full', includeBundled: false },
    files: full.files,
    requiredMedia: ['media/personal/photo.png'],
    includedMedia: [full.media[0]],
    omittedMedia: [full.media[1]],
    warnings: [
      'media/bundled/starter.ogg: bundled media omitted; download the retained content revision again.',
    ],
  });
  const reordered = structuredClone(full);
  reordered.files.reverse();
  reordered.media.reverse();
  reordered.packRevisions.reverse();
  reordered.eventWatermark.reverse();
  const before = structuredClone(reordered);
  expect(inspectManifest(reordered)).toEqual(result);
  expect(reordered).toEqual(before);
});

it('W09: AC1 progress-only explicitly warns that omitted personal media is not recoverable', () => {
  expect(inspectManifest(progress)).toMatchObject({
    formatVersion: 2,
    logicalVersion: 1,
    schemaVersions: { database: 1, content: 1 },
    eventWatermark: [
      { deviceId: 'historical-device-a', sequence: 42 },
      { deviceId: 'historical-device-b', sequence: 12 },
    ],
    retainedContentRevisions: [
      { packId: 'starter', revision: '2026-10-01' },
      { packId: 'starter', revision: '2026-10-02' },
    ],
    mediaPolicy: { mode: 'progress-only', includeBundled: false },
    requiredMedia: [],
    includedMedia: [],
    omittedMedia: [progress.media[1], progress.media[0]],
    warnings: [
      'media/bundled/starter.ogg: bundled media omitted; download the retained content revision again.',
      'media/personal/photo.png: personal media omitted; not recoverable from this backup.',
    ],
  });
  expect(inspectManifest({ ...progress, media: [...progress.media].reverse() })).toEqual(
    inspectManifest(progress),
  );
});

function rejects(value: unknown, field: string) {
  let error: unknown;
  try {
    validateManifest(value);
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(InventoryError);
  expect((error as InventoryError).field).toBe(field);
  expect((error as InventoryError).message).toMatch(
    new RegExp(`^${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: `),
  );
}

describe('I12: AC2 inventory boundary rejects invalid fields', () => {
  it.each([
    ['format', 'zip'],
    ['formatVersion', 1],
    ['formatVersion', 3],
    ['logicalVersion', 2],
    ['appVersion', 'latest'],
    ['exportedAt', '2026-02-30T12:00:00.000Z'],
    ['exportedAt', '2026-10-03'],
    ['profileIds', []],
    ['files', null],
    ['media', {}],
    ['settings', null],
  ])('%s rejects %j', (field, value) => rejects({ ...full, [field]: value }, field));
  it.each(['database', 'content'])('rejects unsupported %s schema independently', (field) =>
    rejects(
      { ...full, schemaVersions: { ...full.schemaVersions, [field]: 2 } },
      `schemaVersions.${field}`,
    ),
  );
  it.each([
    '../escape',
    '/absolute',
    'C:/drive',
    'a\\b',
    'a//b',
    './data',
    'a/../b',
    'a/%2e%2e/b',
    'a/with space',
    'a/nul.txt',
    'a/end.',
    'manifest.json',
    'manifest.json/child',
    'a/\u0000b',
  ])('rejects unsafe path %j', (path) => {
    const value = structuredClone(full);
    value.files[0]!.path = path;
    rejects(value, 'files[0].path');
  });
  it.each(['no-hash', 'a'.repeat(63), 'g'.repeat(64), 'A'.repeat(64)])(
    'rejects bad checksum %s',
    (sha256) => {
      const value = structuredClone(full);
      value.files[0]!.sha256 = sha256;
      rejects(value, 'files[0].sha256');
    },
  );
  it.each([-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity])('rejects invalid size %s', (size) => {
    const value = structuredClone(full);
    value.files[0]!.size = size;
    rejects(value, 'files[0].size');
  });
  it('rejects duplicate paths and case aliases', () => {
    for (const path of ['data/events.ndjson', 'DATA/EVENTS.NDJSON']) {
      const value = structuredClone(full);
      value.files.push({ ...value.files[0]!, path });
      rejects(value, 'files[2].path');
    }
  });
  it('rejects file/directory collisions', () => {
    const value = structuredClone(full);
    value.files.push({ ...value.files[0]!, path: 'data/events.ndjson/child' });
    rejects(value, 'files[0].path');
  });
  it('rejects duplicate profile, revision, watermark and media references', () => {
    rejects({ ...full, profileIds: ['p', 'p'] }, 'profileIds[1]');
    rejects(
      { ...full, packRevisions: [full.packRevisions[0], full.packRevisions[0]] },
      'packRevisions[1]',
    );
    rejects(
      { ...full, eventWatermark: [full.eventWatermark[0], full.eventWatermark[0]] },
      'eventWatermark[1].deviceId',
    );
    rejects({ ...full, media: [full.media[0], full.media[0]] }, 'media[1].path');
  });
  it('rejects invalid historical watermark sequences', () => {
    rejects(
      { ...full, eventWatermark: [{ deviceId: 'source', sequence: -1 }] },
      'eventWatermark[0].sequence',
    );
  });
  it('rejects unknown inventory fields', () =>
    rejects({ ...full, legacySnapshots: [] }, 'manifest.legacySnapshots'));
  it('rejects inconsistent media policies, missing files and unreferenced files', () => {
    rejects(
      { ...full, mediaPolicy: { mode: 'unexpected', includeBundled: false } },
      'mediaPolicy.mode',
    );
    rejects(
      { ...progress, mediaPolicy: { mode: 'progress-only', includeBundled: true } },
      'mediaPolicy.includeBundled',
    );
    rejects(
      { ...full, media: [{ ...full.media[0], included: false }, full.media[1]] },
      'media[0].included',
    );
    rejects(
      { ...progress, media: [{ ...progress.media[0], included: true }, progress.media[1]] },
      'media[0].included',
    );
    rejects({ ...full, files: full.files.slice(0, 1) }, 'media[0].path');
    rejects({ ...progress, files: full.files }, 'media[0].path');
    rejects({ ...full, media: full.media.slice(1) }, 'files[1].path');
    rejects(
      { ...full, files: full.files.map((file) => ({ ...file, kind: 'data' })) },
      'media[0].path',
    );
    rejects({ ...full, mediaPolicy: { mode: 'full', includeBundled: true } }, 'media[1].included');
  });
  it('accepts full bundled inclusion only with matching file metadata', () => {
    const value = structuredClone(full);
    value.mediaPolicy.includeBundled = true;
    value.media[1]!.included = true;
    value.files.push({ ...value.files[1]!, path: value.media[1]!.path });
    expect(inspectManifest(value).omittedMedia).toEqual([]);
    expect(inspectManifest(value).warnings).toEqual([]);
  });
});

it.each([
  'installationId',
  'deviceId',
  'deviceSequence',
  'physicalPaths',
  'connections',
  'platformPermissions',
  'notificationOsIds',
  'unknownPreference',
])('I22: AC3 rejects destination-local or unknown setting %s', (key) => {
  expect(() => validatePortableSettings({ ...full.settings, [key]: 'destination-local' })).toThrow(
    `settings.${key}:`,
  );
  rejects(
    { ...full, settings: { ...full.settings, [key]: 'destination-local' } },
    `settings.${key}`,
  );
});
it('I22: AC3 portable preferences preserve historical source device IDs without an installation identity', () => {
  expect(validatePortableSettings(full.settings)).toEqual(full.settings);
  expect(validateManifest(full).eventWatermark).toEqual(full.eventWatermark);
  expect(validatePortableSettings({})).toEqual({});
  expect(() => validatePortableSettings({ uiLanguage: { deviceId: 'local' } })).toThrow(
    'settings.uiLanguage:',
  );
  expect(() => validatePortableSettings({ dailyNew: '2' })).toThrow('settings.dailyNew:');
  expect(() => validatePortableSettings({ studyDayBoundaryHour: 24 })).toThrow(
    'settings.studyDayBoundaryHour:',
  );
});
