// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

function run(input: string) {
  return spawnSync(process.execPath, ['tools/contracts/inspect-backup.ts'], {
    cwd: new URL('../../../', import.meta.url),
    input,
    encoding: 'utf8',
  });
}

it.each(['full', 'progress-only'])(
  'W09: AC1 Node inspector reports the %s example deterministically',
  (name) => {
    const input = readFileSync(
      new URL(`../../fixtures/backup-manifests/${name}.json`, import.meta.url),
      'utf8',
    );
    const first = run(input);
    expect(first.status).toBe(0);
    expect(first.stderr).toBe('');
    expect(run(input).stdout).toBe(first.stdout);
    const report: unknown = JSON.parse(first.stdout);
    expect(report).toMatchObject({
      compatibility: 'supported',
      verification: 'inventory-only',
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
      requiredMedia: name === 'full' ? ['media/personal/photo.png'] : [],
      includedMedia:
        name === 'full'
          ? [{ path: 'media/personal/photo.png', origin: 'personal', included: true }]
          : [],
      omittedMedia:
        name === 'full'
          ? [{ path: 'media/bundled/starter.ogg', origin: 'bundled', included: false }]
          : [
              { path: 'media/bundled/starter.ogg', origin: 'bundled', included: false },
              { path: 'media/personal/photo.png', origin: 'personal', included: false },
            ],
      warnings:
        name === 'full'
          ? [
              'media/bundled/starter.ogg: bundled media omitted; download the retained content revision again.',
            ]
          : [
              'media/bundled/starter.ogg: bundled media omitted; download the retained content revision again.',
              'media/personal/photo.png: personal media omitted; not recoverable from this backup.',
            ],
    });
  },
);

it('I12: CLI rejects malformed JSON and unsupported inventories without success output', () => {
  for (const [input, field] of [
    ['{', 'manifest'],
    ['{"format":"woorden.zip","formatVersion":1}', 'formatVersion'],
  ]) {
    const result = run(input!);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(`${field}:`);
  }
});
