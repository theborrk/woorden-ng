// @vitest-environment node
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { importAudio, inspectAudio, inspectWav, packageAudio, resolveAudio } from './media.mjs';
import { taskEligibility } from './compile-pack.mjs';
import { digest, payloadHash } from './validate-entry.mjs';

// A tone is a container test fixture, never a pronunciation-reviewed Dutch recording.
function fixture() {
  const bytes = Buffer.alloc(16044);
  bytes.write('RIFF');
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24);
  bytes.writeUInt32LE(16000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(16000, 40);
  for (let i = 44; i < bytes.length; i += 2) bytes.writeInt16LE(Math.round(1000 * Math.sin(i)), i);
  const record = { lemma: 'synthetic-audio-cue' };
  const entry = {
    id: 'test-sense',
    lexeme: { lemma: record.lemma },
    sense: { meanings: { en: ['test'], pl: ['test'] } },
    forms: [],
    examples: [],
    sources: [{ id: 'test-source', record_sha256: digest(record) }],
    provenance: { '/lexeme/lemma': { status: 'source_verified', source_ids: ['test-source'] } },
  };
  entry.content_sha256 = payloadHash(entry);
  const asset = {
    id: 'test-audio',
    entry_id: entry.id,
    content_sha256: entry.content_sha256,
    target: 'lemma',
    text: entry.lexeme.lemma,
    voice: 'synthetic tone',
    region: 'unspecified',
    source_url: 'https://example.test/tone',
    attribution: 'Synthetic test fixture',
    license: 'CC0-1.0',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    mime: 'audio/wav',
    duration_ms: 1000,
    size_bytes: bytes.length,
    file: 'tone.wav',
  };
  asset.pronunciation_qa = {
    status: 'passed',
    reviewer: 'synthetic test only',
    run_ref: 'test-only',
    sha256: asset.sha256,
    text: asset.text,
    content_sha256: asset.content_sha256,
  };
  const context = {
    validation: { valid: true },
    languageCheck: { status: 'ai_reviewed', content_sha256: entry.content_sha256 },
    evidence: {
      records: { 'test-source': record },
      claims: [{ pointer: '/lexeme/lemma', source_id: 'test-source', selector: '/lemma' }],
    },
  };
  return { entry, asset, bytes, context };
}
const manifest = (asset) => ({ schema_version: 'woorden-audio-manifest-1', assets: [asset] });
it('W21: AC1 an approved local slice packages and replays by hash after offline copying', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audio-pack-'));
  try {
    const f = fixture();
    writeFileSync(join(dir, f.asset.file), f.bytes);
    const result = importAudio(manifest(f.asset), [f.entry], dir);
    expect(result.report.approved).toBe(1);
    const pack = join(dir, 'downloaded');
    packageAudio(result, pack);
    expect(resolveAudio(pack, f.asset.sha256)).toEqual(f.bytes);
    expect(JSON.parse(readFileSync(join(pack, 'media.json')))[0]).toMatchObject({
      text: f.asset.text,
      voice: f.asset.voice,
      region: 'unspecified',
      download_status: 'downloaded',
      qa: 'passed',
      attribution: f.asset.attribution,
      duration_ms: 1000,
    });
    const decisions = taskEligibility(f.entry, { ...f.context, media: result.media });
    expect(decisions.en.listening.eligible).toBe(true);
    expect(decisions.en.listening.media_ids).toEqual([f.asset.id]);
    writeFileSync(join(pack, 'assets', `${f.asset.sha256}.wav`), Buffer.from('corrupt'));
    expect(() => resolveAudio(pack, f.asset.sha256)).toThrow('checksum mismatch');
    expect(() => packageAudio(result, pack)).toThrow();
    expect(() => resolveAudio(pack, '../invalid')).toThrow('Invalid audio hash');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it('T43: AC2 missing, corrupt, wrong-text, stale QA and unsupported assets block listening while written recall stays eligible', () => {
  const f = fixture();
  for (const [asset, bytes] of [
    [f.asset, null],
    [f.asset, Buffer.from('corrupt')],
    [{ ...f.asset, text: 'wrong cue' }, f.bytes],
    [{ ...f.asset, sha256: '0'.repeat(64) }, f.bytes],
    [{ ...f.asset, duration_ms: 900 }, f.bytes],
    [{ ...f.asset, mime: 'audio/mpeg' }, f.bytes],
    [{ ...f.asset, region: 'en-US' }, f.bytes],
    [{ ...f.asset, attribution: '' }, f.bytes],
    [
      { ...f.asset, pronunciation_qa: { ...f.asset.pronunciation_qa, sha256: '0'.repeat(64) } },
      f.bytes,
    ],
    [{ ...f.asset, pronunciation_qa: { ...f.asset.pronunciation_qa, text: 'old text' } }, f.bytes],
    [{ ...f.asset, content_sha256: '0'.repeat(64) }, f.bytes],
  ]) {
    const inspected = inspectAudio(asset, f.entry, bytes);
    expect(inspected.available).toBe(false);
    const decision = taskEligibility(f.entry, { ...f.context, media: [inspected] });
    expect(decision.en.listening.eligible).toBe(false);
    expect(decision.en.spelling.eligible).toBe(false);
    expect(decision.en.receptive.eligible).toBe(true);
    expect(decision.pl.productive.eligible).toBe(true);
  }
  const exampleAsset = { ...f.asset, target: 'example', target_id: 'example' };
  const entry = {
    ...f.entry,
    examples: [{ id: 'example', nl: f.asset.text, target_form_ids: [] }],
  };
  const assessed = inspectAudio(exampleAsset, entry, f.bytes);
  expect(assessed.available).toBe(true);
  expect(taskEligibility(entry, { ...f.context, media: [assessed] }).en.listening.eligible).toBe(
    false,
  );
});
it('T50: AC3 unlistened source URLs and downloaded bytes remain candidate-only without hash-bound pronunciation QA', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audio-candidate-'));
  try {
    const f = fixture();
    delete f.asset.pronunciation_qa;
    const urlOnly = importAudio(
      manifest({ ...f.asset, file: null, qa: 'passed', available: true }),
      [f.entry],
      dir,
    );
    expect(urlOnly.media[0]).toMatchObject({
      available: false,
      qa: 'not_run',
      download_status: 'missing',
    });
    expect(urlOnly.files.size).toBe(0);
    writeFileSync(join(dir, f.asset.file), f.bytes);
    const downloaded = importAudio(manifest(f.asset), [f.entry], dir);
    expect(downloaded.media[0]).toMatchObject({
      available: false,
      qa: 'not_run',
      download_status: 'downloaded',
    });
    expect(downloaded.media[0].blockers).toEqual(['pronunciation_qa_required']);
    expect(downloaded.files.size).toBe(0);
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest(f.asset)));
    writeFileSync(join(dir, 'state.json'), JSON.stringify({ entries: [f.entry] }));
    const output = join(dir, 'candidate-pack');
    const args = [
      'tools/content/media.mjs',
      join(dir, 'manifest.json'),
      join(dir, 'state.json'),
      dir,
      output,
    ];
    const run = spawnSync(process.execPath, args, { encoding: 'utf8' });
    expect(run.status, run.stderr).toBe(0);
    expect(JSON.parse(run.stdout)).toMatchObject({ total: 1, approved: 0 });
    expect(JSON.parse(readFileSync(join(output, 'media.json')))[0].qa).toBe('not_run');
    expect(spawnSync(process.execPath, args).status).toBe(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it('W21: malformed PCM chunks and traversal/symlink paths fail closed', () => {
  const f = fixture();
  for (const mutate of [
    (b) => b.writeUInt32LE(100, 4),
    (b) => b.writeUInt32LE(20000, 40),
    (b) => b.writeUInt16LE(0, 32),
    (b) => b.writeUInt16LE(3, 20),
    (b) => b.writeUInt32LE(0, 40),
    (b) => b.writeUInt32LE(1, 28),
  ]) {
    const bytes = Buffer.from(f.bytes);
    mutate(bytes);
    expect(() => inspectWav(bytes)).toThrow();
  }
  const dir = mkdtempSync(join(tmpdir(), 'audio-paths-'));
  try {
    for (const file of ['../outside.wav', '/outside.wav'])
      expect(() => importAudio(manifest({ ...f.asset, file }), [f.entry], dir)).toThrow(
        'Unsafe audio path',
      );
    symlinkSync('/etc/hosts', join(dir, 'escape.wav'));
    expect(() => importAudio(manifest({ ...f.asset, file: 'escape.wav' }), [f.entry], dir)).toThrow(
      'Unsafe audio path',
    );
    expect(() =>
      importAudio({ ...manifest(f.asset), assets: [f.asset, f.asset] }, [f.entry], dir),
    ).toThrow('unique IDs');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
