/** Logical inventories only: validation does not verify archive bytes or event bodies. */
export interface PortableSettings {
  uiLanguage?: 'en' | 'pl';
  translationLanguage?: 'en' | 'pl';
  timezone?: string;
  studyDayBoundaryHour?: number;
  dailyNew?: number;
  autoplay?: boolean;
}

export interface BackupManifest {
  format: 'woorden.zip';
  formatVersion: 2;
  logicalVersion: 1;
  schemaVersions: { database: 1; content: 1 };
  appVersion: string;
  exportedAt: string;
  profileIds: string[];
  packRevisions: { packId: string; revision: string }[];
  /** Historical source installation IDs, never destination installation settings. */
  eventWatermark: { deviceId: string; sequence: number }[];
  settings: PortableSettings;
  mediaPolicy: { mode: 'full' | 'progress-only'; includeBundled: boolean };
  files: { path: string; size: number; sha256: string; kind: 'data' | 'media' }[];
  media: { path: string; origin: 'personal' | 'bundled'; included: boolean }[];
}

export class InventoryError extends Error {
  readonly field: string;
  constructor(field: string, reason: string) {
    super(`${field}: ${reason}`);
    this.name = 'InventoryError';
    this.field = field;
  }
}

function fail(field: string, reason: string): never {
  throw new InventoryError(field, reason);
}
function object(value: unknown, field: string, keys: readonly string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    fail(field, 'expected an object');
  for (const key of Object.keys(value))
    if (!keys.includes(key)) fail(`${field}.${key}`, 'unknown or nonportable field');
  return value as Record<string, unknown>;
}
function text(value: unknown, field: string): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    [...value].some((char) => char.codePointAt(0)! < 32 || char.codePointAt(0) === 127)
  )
    fail(field, 'expected a nonempty string without control characters');
  return value;
}
function integer(value: unknown, field: string, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > max)
    fail(field, `expected an integer from 0 to ${max}`);
  return value;
}
function boolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') fail(field, 'expected a boolean');
  return value;
}
function choice<T extends string | number>(
  value: unknown,
  field: string,
  choices: readonly T[],
): T {
  const found = choices.find((candidate) => candidate === value);
  if (found === undefined) fail(field, `expected ${choices.join(' or ')}`);
  return found;
}
function list<T>(value: unknown, field: string, parse: (value: unknown, field: string) => T): T[] {
  if (!Array.isArray(value)) fail(field, 'expected an array');
  return value.map((entry: unknown, index) => parse(entry, `${field}[${index}]`));
}
function unique<T>(entries: T[], field: string, key: (entry: T) => string, suffix = ''): T[] {
  const seen = new Set<string>();
  entries.forEach((entry, index) => {
    const id = key(entry);
    if (seen.has(id)) fail(`${field}[${index}]${suffix}`, 'duplicate value');
    seen.add(id);
  });
  return entries;
}
function path(value: unknown, field: string): string {
  const name = text(value, field);
  // A deliberately portable ASCII subset avoids decoding, drive names and filesystem aliases.
  if (
    !name.split('/').every((part) => /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(part)) ||
    name
      .split('/')
      .some(
        (part) => part.endsWith('.') || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(part),
      ) ||
    name.split('/')[0]!.toLowerCase() === 'manifest.json'
  )
    fail(field, 'unsafe or reserved archive path');
  return name;
}

/** Unknown settings are rejected, rather than silently transferring destination-local state. */
export function validatePortableSettings(value: unknown): PortableSettings {
  const settings = object(value, 'settings', [
    'uiLanguage',
    'translationLanguage',
    'timezone',
    'studyDayBoundaryHour',
    'dailyNew',
    'autoplay',
  ]);
  const result: PortableSettings = {};
  for (const key of ['uiLanguage', 'translationLanguage'] as const)
    if (Object.hasOwn(settings, key))
      result[key] = choice(settings[key], `settings.${key}`, ['en', 'pl']);
  if (Object.hasOwn(settings, 'timezone'))
    result.timezone = text(settings.timezone, 'settings.timezone');
  if (Object.hasOwn(settings, 'studyDayBoundaryHour'))
    result.studyDayBoundaryHour = integer(
      settings.studyDayBoundaryHour,
      'settings.studyDayBoundaryHour',
      23,
    );
  if (Object.hasOwn(settings, 'dailyNew'))
    result.dailyNew = integer(settings.dailyNew, 'settings.dailyNew');
  if (Object.hasOwn(settings, 'autoplay'))
    result.autoplay = boolean(settings.autoplay, 'settings.autoplay');
  return result;
}

export function validateManifest(value: unknown): BackupManifest {
  const m = object(value, 'manifest', [
    'format',
    'formatVersion',
    'logicalVersion',
    'schemaVersions',
    'appVersion',
    'exportedAt',
    'profileIds',
    'packRevisions',
    'eventWatermark',
    'settings',
    'mediaPolicy',
    'files',
    'media',
  ]);
  const format = choice(m.format, 'format', ['woorden.zip']);
  const formatVersion = choice(m.formatVersion, 'formatVersion', [2]);
  const logicalVersion = choice(m.logicalVersion, 'logicalVersion', [1]);
  const schemas = object(m.schemaVersions, 'schemaVersions', ['database', 'content']);
  const schemaVersions = {
    database: choice(schemas.database, 'schemaVersions.database', [1]),
    content: choice(schemas.content, 'schemaVersions.content', [1]),
  };
  const appVersion = text(m.appVersion, 'appVersion');
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(appVersion))
    fail('appVersion', 'expected a semantic app version');
  const exportedAt = text(m.exportedAt, 'exportedAt');
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(exportedAt) ||
    !Number.isFinite(Date.parse(exportedAt)) ||
    new Date(exportedAt).toISOString() !== exportedAt
  )
    fail('exportedAt', 'expected a canonical UTC instant');
  const profileIds = unique(list(m.profileIds, 'profileIds', text), 'profileIds', (id) => id);
  if (!profileIds.length) fail('profileIds', 'at least one profile required');
  const packRevisions = unique(
    list(m.packRevisions, 'packRevisions', (value, field) => {
      const p = object(value, field, ['packId', 'revision']);
      return {
        packId: text(p.packId, `${field}.packId`),
        revision: text(p.revision, `${field}.revision`),
      };
    }),
    'packRevisions',
    (p) => `${p.packId}\u0000${p.revision}`,
  );
  const eventWatermark = unique(
    list(m.eventWatermark, 'eventWatermark', (value, field) => {
      const w = object(value, field, ['deviceId', 'sequence']);
      return {
        deviceId: text(w.deviceId, `${field}.deviceId`),
        sequence: integer(w.sequence, `${field}.sequence`),
      };
    }),
    'eventWatermark',
    (w) => w.deviceId,
    '.deviceId',
  );
  const settings = validatePortableSettings(m.settings);
  const policy = object(m.mediaPolicy, 'mediaPolicy', ['mode', 'includeBundled']);
  const mediaPolicy = {
    mode: choice(policy.mode, 'mediaPolicy.mode', ['full', 'progress-only']),
    includeBundled: boolean(policy.includeBundled, 'mediaPolicy.includeBundled'),
  };
  if (mediaPolicy.mode === 'progress-only' && mediaPolicy.includeBundled)
    fail('mediaPolicy.includeBundled', 'progress-only cannot include media');
  const files = unique(
    list(m.files, 'files', (value, field) => {
      const f = object(value, field, ['path', 'size', 'sha256', 'kind']);
      const sha256 = text(f.sha256, `${field}.sha256`);
      if (!/^[a-f0-9]{64}$/.test(sha256)) fail(`${field}.sha256`, 'expected lowercase SHA-256 hex');
      return {
        path: path(f.path, `${field}.path`),
        size: integer(f.size, `${field}.size`),
        sha256,
        kind: choice(f.kind, `${field}.kind`, ['data', 'media']),
      };
    }),
    'files',
    (f) => f.path.toLowerCase(),
    '.path',
  );
  // A file cannot also be a directory, including on case-insensitive destinations.
  files.forEach((f, index) => {
    if (files.some((other) => other.path.toLowerCase().startsWith(`${f.path.toLowerCase()}/`)))
      fail(`files[${index}].path`, 'file/directory collision');
  });
  const media = unique(
    list(m.media, 'media', (value, field) => {
      const item = object(value, field, ['path', 'origin', 'included']);
      return {
        path: path(item.path, `${field}.path`),
        origin: choice(item.origin, `${field}.origin`, ['personal', 'bundled']),
        included: boolean(item.included, `${field}.included`),
      };
    }),
    'media',
    (item) => item.path.toLowerCase(),
    '.path',
  );
  media.forEach((item, index) => {
    const expected =
      mediaPolicy.mode === 'full' && (item.origin === 'personal' || mediaPolicy.includeBundled);
    if (item.included !== expected)
      fail(`media[${index}].included`, 'inconsistent with mediaPolicy');
    const file = files.find((file) => file.path.toLowerCase() === item.path.toLowerCase());
    if (item.included ? file?.kind !== 'media' || file.path !== item.path : file !== undefined)
      fail(
        `media[${index}].path`,
        'included media needs a matching media file; omitted media must have none',
      );
  });
  files.forEach((file, index) => {
    if (file.kind === 'media' && !media.some((item) => item.path === file.path && item.included))
      fail(`files[${index}].path`, 'media file has no included media reference');
  });
  return {
    format,
    formatVersion,
    logicalVersion,
    schemaVersions,
    appVersion,
    exportedAt,
    profileIds,
    packRevisions,
    eventWatermark,
    settings,
    mediaPolicy,
    files,
    media,
  };
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Canonical report order is independent of inventory order, locale and live clock. */
export function inspectManifest(value: unknown) {
  const m = validateManifest(value);
  const orderedMedia = [...m.media].sort((a, b) => compare(a.path, b.path));
  const omittedMedia = orderedMedia.filter((item) => !item.included);
  return {
    compatibility: 'supported' as const,
    verification: 'inventory-only' as const,
    format: m.format,
    formatVersion: m.formatVersion,
    logicalVersion: m.logicalVersion,
    schemaVersions: m.schemaVersions,
    appVersion: m.appVersion,
    exportedAt: m.exportedAt,
    profileIds: [...m.profileIds].sort(compare),
    retainedContentRevisions: [...m.packRevisions].sort(
      (a, b) => compare(a.packId, b.packId) || compare(a.revision, b.revision),
    ),
    eventWatermark: [...m.eventWatermark].sort((a, b) => compare(a.deviceId, b.deviceId)),
    mediaPolicy: m.mediaPolicy,
    files: [...m.files].sort((a, b) => compare(a.path, b.path)),
    requiredMedia: orderedMedia
      .filter((item) => m.mediaPolicy.mode === 'full' && item.origin === 'personal')
      .map((item) => item.path),
    includedMedia: orderedMedia.filter((item) => item.included),
    omittedMedia,
    warnings: omittedMedia.map((item) =>
      item.origin === 'personal'
        ? `${item.path}: personal media omitted; not recoverable from this backup.`
        : `${item.path}: bundled media omitted; download the retained content revision again.`,
    ),
  };
}
