import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const text = (value) => typeof value === 'string' && value.trim().length > 0;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Validate the entire RIFF container and uncompressed PCM frames, without inferring pronunciation. */
export function inspectWav(bytes) {
  if (
    bytes.length < 44 ||
    bytes.toString('ascii', 0, 4) !== 'RIFF' ||
    bytes.toString('ascii', 8, 12) !== 'WAVE' ||
    bytes.readUInt32LE(4) !== bytes.length - 8
  )
    throw new Error('Invalid or truncated WAV container');
  let format = null,
    data = null;
  for (let offset = 12; offset < bytes.length;) {
    if (offset + 8 > bytes.length) throw new Error('Truncated WAV chunk');
    const kind = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4),
      start = offset + 8;
    const end = start + size + (size % 2);
    if (end > bytes.length) throw new Error('Truncated WAV payload');
    if (kind === 'fmt ') {
      if (format || size !== 16 || bytes.readUInt16LE(start) !== 1)
        throw new Error('Only PCM WAV is supported');
      format = {
        channels: bytes.readUInt16LE(start + 2),
        sampleRate: bytes.readUInt32LE(start + 4),
        byteRate: bytes.readUInt32LE(start + 8),
        blockAlign: bytes.readUInt16LE(start + 12),
        bits: bytes.readUInt16LE(start + 14),
      };
    }
    if (kind === 'data') {
      if (data !== null) throw new Error('Duplicate WAV data');
      data = size;
    }
    offset = end;
  }
  if (
    !format ||
    !data ||
    ![1, 2].includes(format.channels) ||
    ![8, 16, 24, 32].includes(format.bits) ||
    format.sampleRate < 8000 ||
    format.sampleRate > 192000 ||
    format.blockAlign !== (format.channels * format.bits) / 8 ||
    format.byteRate !== format.sampleRate * format.blockAlign ||
    data % format.blockAlign
  )
    throw new Error('Invalid PCM frame layout');
  return { duration_ms: (data / format.byteRate) * 1000, size_bytes: bytes.length };
}

export function expectedAudioText(entry, asset) {
  if (asset.target === 'lemma') return entry.lexeme?.lemma;
  if (asset.target === 'form') return entry.forms?.find((f) => f.id === asset.target_id)?.surface;
  if (asset.target === 'example') return entry.examples?.find((e) => e.id === asset.target_id)?.nl;
  return undefined;
}

/** Only lemma cues serve the current compiler's sense-level listening/spelling contracts. */
export function usableAudio(entry, asset) {
  return (
    asset.kind === 'audio' &&
    asset.entry_id === entry.id &&
    asset.content_sha256 === entry.content_sha256 &&
    asset.target === 'lemma' &&
    asset.text === expectedAudioText(entry, asset) &&
    asset.inspection === 'pcm_wav_verified' &&
    asset.download_status === 'downloaded' &&
    asset.mime === 'audio/wav' &&
    asset.duration_ms > 0 &&
    asset.size_bytes > 44
  );
}

export function inspectAudio(asset, entry, bytes) {
  const candidate = {
    ...asset,
    kind: 'audio',
    available: false,
    qa: 'not_run',
    inspection: 'unchecked',
    download_status: bytes ? 'invalid' : 'missing',
    blockers: [],
  };
  if (
    !entry ||
    asset.content_sha256 !== entry.content_sha256 ||
    !text(expectedAudioText(entry, asset)) ||
    asset.text !== expectedAudioText(entry, asset)
  )
    candidate.blockers.push('text_or_entry_identity_mismatch');
  if (
    !text(asset.id) ||
    !text(asset.voice) ||
    !['nl-NL', 'nl-BE', 'unspecified'].includes(asset.region) ||
    !text(asset.license) ||
    !text(asset.attribution) ||
    !text(asset.source_url) ||
    !/^[a-f0-9]{64}$/.test(asset.sha256 ?? '') ||
    asset.mime !== 'audio/wav' ||
    !Number.isFinite(asset.duration_ms) ||
    asset.duration_ms <= 0 ||
    !Number.isSafeInteger(asset.size_bytes) ||
    asset.size_bytes <= 44
  )
    candidate.blockers.push('invalid_audio_metadata');
  if (!bytes) candidate.blockers.push('missing_download');
  else {
    if (hash(bytes) !== asset.sha256) candidate.blockers.push('checksum_mismatch');
    try {
      const measured = inspectWav(bytes);
      if (
        measured.size_bytes !== asset.size_bytes ||
        Math.abs(measured.duration_ms - asset.duration_ms) > 1
      )
        candidate.blockers.push('size_or_duration_mismatch');
      candidate.inspection = 'pcm_wav_verified';
    } catch (error) {
      candidate.blockers.push(error.message);
    }
  }
  // A recorded listening check binds the exact audio, input text and content revision.
  const qa = asset.pronunciation_qa;
  if (!(
    qa?.status === 'passed' &&
    text(qa.run_ref) &&
    text(qa.reviewer) &&
    qa.sha256 === asset.sha256 &&
    qa.text === asset.text &&
    qa.content_sha256 === asset.content_sha256
  ))
    candidate.blockers.push('pronunciation_qa_required');
  if (candidate.blockers.length === 0) {
    candidate.available = true;
    candidate.download_status = 'downloaded';
    candidate.qa = 'passed';
    candidate.qa_run_ref = qa.run_ref;
  } else if (bytes && candidate.blockers.every((b) => b === 'pronunciation_qa_required'))
    candidate.download_status = 'downloaded';
  return candidate;
}

/** Local acquisition only: URLs remain provenance, never an implicit network fallback. */
export function importAudio(manifest, entries, directory) {
  if (
    manifest?.schema_version !== 'woorden-audio-manifest-1' ||
    !Array.isArray(manifest.assets) ||
    !Array.isArray(entries) ||
    new Set(entries.map((e) => e.id)).size !== entries.length ||
    new Set(manifest.assets.map((a) => a.id)).size !== manifest.assets.length
  )
    throw new Error('Expected audio manifest with unique IDs and entry collection');
  const root = realpathSync(directory);
  const files = new Map();
  const media = manifest.assets.map((asset) => {
    let bytes = null;
    if (asset.file !== undefined && asset.file !== null) {
      if (!text(asset.file) || isAbsolute(asset.file) || asset.file.split(/[\\/]/).includes('..'))
        throw new Error('Unsafe audio path');
      try {
        const path = realpathSync(resolve(root, asset.file));
        const rel = relative(root, path);
        if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel))
          throw new Error('Unsafe audio path');
        bytes = readFileSync(path);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    const assessed = inspectAudio(
      asset,
      entries.find((e) => e.id === asset.entry_id),
      bytes,
    );
    if (assessed.available) files.set(asset.sha256, bytes);
    return assessed;
  });
  return {
    media,
    files,
    report: {
      total: media.length,
      approved: media.filter((a) => a.available).length,
      candidates: media
        .filter((a) => !a.available)
        .map((a) => ({ id: a.id, blockers: a.blockers, download_status: a.download_status })),
    },
  };
}

export function resolveAudio(directory, sha256) {
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error('Invalid audio hash');
  const bytes = readFileSync(resolve(directory, 'assets', `${sha256}.wav`));
  if (hash(bytes) !== sha256) throw new Error('Downloaded audio checksum mismatch');
  inspectWav(bytes);
  return bytes;
}

export function packageAudio(result, output) {
  // Exclusive directory creation preserves an existing pack on failed or repeated imports.
  mkdirSync(output);
  try {
    mkdirSync(resolve(output, 'assets'));
    for (const [sha256, bytes] of result.files)
      writeFileSync(resolve(output, 'assets', `${sha256}.wav`), bytes, { flag: 'wx' });
    writeFileSync(resolve(output, 'media.json'), `${JSON.stringify(result.media, null, 2)}\n`, {
      flag: 'wx',
    });
    writeFileSync(resolve(output, 'report.json'), `${JSON.stringify(result.report, null, 2)}\n`, {
      flag: 'wx',
    });
  } catch (error) {
    rmSync(output, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [manifest, state, directory, output, ...extra] = process.argv.slice(2);
    if (!output || extra.length)
      throw new Error('Usage: content:media MANIFEST.json STATE.json LOCAL_AUDIO_DIR NEW_PACK_DIR');
    const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
    const result = importAudio(read(manifest), read(state).entries, directory);
    packageAudio(result, output);
    console.log(JSON.stringify(result.report, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
