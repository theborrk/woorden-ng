// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkSpelling, importOpenTaal } from './opentaal-spelling.mjs';

const dir = 'tests/fixtures/content-sources/opentaal/';
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const wordlist = `${dir}wordlist.txt`;
const version = `${dir}version.txt`;
const pins = {
  wordlistManifest: readJson(`${dir}wordlist.manifest.json`),
  versionManifest: readJson(`${dir}version.manifest.json`),
};
const entries = readJson(`${dir}entries.json`);
const records = readJson(`${dir}records.json`);
const hash = (text) => createHash('sha256').update(text).digest('hex');
const directories = [];
afterEach(() =>
  directories.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })),
);
function workspace() {
  const path = mkdtempSync(join(tmpdir(), 'opentaal-'));
  directories.push(path);
  return path;
}
function cli(list = wordlist, marker = version, extra = []) {
  return spawnSync(
    'npm',
    [
      '--silent',
      'run',
      'content:spelling',
      '--',
      'import',
      list,
      '--version',
      marker,
      '--wordlist-manifest',
      `${dir}wordlist.manifest.json`,
      '--version-manifest',
      `${dir}version.manifest.json`,
      ...extra,
    ],
    { encoding: 'utf8' },
  );
}

describe('advisory OpenTaal spelling checks', () => {
  it('W18: AC1 exact headwords retain snapshot, case-sensitive original spelling and raw record hashes', async () => {
    const imported = await importOpenTaal(wordlist, version, pins);
    const { results } = checkSpelling(imported, [
      { id: 'name', headword: 'Amsterdam' },
      { id: 'lowercase', headword: 'amsterdam' },
      { id: 'accent', headword: 'coöperatie' },
      { id: 'accent-removed', headword: 'cooperatie' },
      { id: 'space', headword: ' huis' },
    ]);
    expect(imported.report).toMatchObject({
      wordlist: pins.wordlistManifest,
      version_marker: { ...pins.versionManifest, original_text: '2023-03-10 14:03:04 2.20.23\n' },
      rows: 5,
      unique_spellings: 5,
      duplicate_rows: 0,
    });
    expect(results[0]).toEqual({
      record: { id: 'name', headword: 'Amsterdam' },
      category: 'headword',
      snapshot: {
        source_id: pins.wordlistManifest.source_id,
        sha256: pins.wordlistManifest.sha256,
        version: '2.20.23',
      },
      exact_match: true,
      observations: [
        {
          source_id: pins.wordlistManifest.source_id,
          source_line: 2,
          original_spelling: 'Amsterdam',
          sha256: records[1].sha256,
        },
      ],
      advisory: null,
    });
    expect(results.map((result) => result.exact_match)).toEqual([true, false, true, false, false]);
    expect(results[2].observations[0].original_spelling).toBe('coöperatie');
    expect(imported.report.policy).toContain('not linguistic approval');
    const lines = readFileSync(wordlist, 'utf8').trimEnd().split('\n');
    expect(
      records.map((record) => ({
        excerpt_line: record.excerpt_line,
        original_spelling: record.original_spelling,
        sha256: record.sha256,
      })),
    ).toEqual(
      lines.map((line, i) => ({
        excerpt_line: i + 1,
        original_spelling: line,
        sha256: hash(`${line}\n`),
      })),
    );
    expect(records.map((record) => record.source_line)).toEqual([
      4423, 17444, 72289, 154849, 411383,
    ]);
  });

  it('W20: AC2 absent phrases, compounds and DigiD/BSN stay in the report with review advisories and provenance intact', async () => {
    const imported = await importOpenTaal(wordlist, version, pins);
    const original = entries.map((entry) => ({
      ...entry,
      ru: 'исходный текст',
      review: { status: 'not_run' },
    }));
    const before = JSON.stringify(original);
    const report = checkSpelling(imported, original);
    expect(report.records).toBe(original.length);
    expect(report.results.map((result) => result.record)).toEqual(original);
    expect(JSON.stringify(original)).toBe(before);
    expect(report.categories).toEqual({
      headword: { records: 2, exact_matches: 1, review_advisories: 1 },
      compound: { records: 2, exact_matches: 1, review_advisories: 1 },
      mwe: { records: 2, exact_matches: 1, review_advisories: 1 },
      named_service: { records: 2, exact_matches: 0, review_advisories: 2 },
    });
    for (const id of ['phrase-miss', 'compound-miss', 'digid', 'bsn']) {
      const result = report.results.find((result) => result.record.id === id);
      expect(result).toMatchObject({
        exact_match: false,
        observations: [],
        advisory: { code: 'opentaal_list_miss', action: 'review' },
      });
      expect(result.advisory.message).toContain('absence does not prove a spelling error');
      expect(result.record.review.status).toBe('not_run');
    }
    expect(report.results.find((result) => result.record.id === 'phrase-hit')).toMatchObject({
      category: 'mwe',
      exact_match: true,
      advisory: null,
    });
    expect(checkSpelling(imported, [{ id: 'case', headword: 'digid' }]).results[0].category).toBe(
      'headword',
    );
  });

  it('F08: CLI prints deterministic import and category reports from local fixtures only', () => {
    const first = cli(wordlist, version, ['--entries', `${dir}entries.json`]);
    const second = cli(wordlist, version, ['--entries', `${dir}entries.json`]);
    expect(first.status, first.stderr).toBe(0);
    expect(first.stderr).toBe('');
    expect(second.status, second.stderr).toBe(0);
    expect(first.stdout).toBe(second.stdout);
    const report = JSON.parse(first.stdout);
    expect(report.rows).toBe(5);
    expect(report.checks.results.map((result) => result.record)).toEqual(entries);
    expect(report.checks.categories.named_service.review_advisories).toBe(2);
    expect(report.checks.results[0].observations[0].original_spelling).toBe('Amsterdam');
    expect(report.wordlist).toEqual(pins.wordlistManifest);
    const onlyImport = cli();
    expect(onlyImport.status, onlyImport.stderr).toBe(0);
    expect(JSON.parse(onlyImport.stdout).checks).toBeUndefined();
  });

  it.each(['wordlist', 'version'])(
    'W18: changed or truncated %s bytes fail before any results are printed',
    async (name) => {
      const original = readFileSync(name === 'wordlist' ? wordlist : version);
      const path = join(workspace(), 'altered.txt');
      for (const text of [
        original.subarray(0, -1),
        Buffer.from(original.toString().replace('a', 'b').replace('2023', '2024')),
      ]) {
        writeFileSync(path, text);
        const list = name === 'wordlist' ? path : wordlist;
        const marker = name === 'version' ? path : version;
        await expect(importOpenTaal(list, marker, pins)).rejects.toThrow(/Source mismatch/);
        const result = cli(list, marker);
        expect(result.status).toBe(1);
        expect(result.stdout).toBe('');
        expect(result.stderr).toContain('File not adopted');
        expect(readFileSync(path)).toEqual(text);
      }
    },
  );

  it('W18: rejects incompatible version pins and malformed rows even when their bytes match a manifest', async () => {
    const path = join(workspace(), 'source.txt');
    const pinFor = (manifest, text) => ({
      ...manifest,
      bytes: Buffer.byteLength(text),
      sha256: hash(text),
    });
    for (const text of ['huis', 'huis\n\n', ' huis\n', 'huis\tdeur\n', Buffer.from([0xff, 0x0a])]) {
      writeFileSync(path, text);
      await expect(
        importOpenTaal(path, version, {
          ...pins,
          wordlistManifest: pinFor(pins.wordlistManifest, text),
        }),
      ).rejects.toThrow();
    }
    for (const text of ['bad marker\n', '2023-03-10 14:03:04 2.20.24\n']) {
      writeFileSync(path, text);
      await expect(
        importOpenTaal(wordlist, path, {
          ...pins,
          versionManifest: pinFor(pins.versionManifest, text),
        }),
      ).rejects.toThrow(/version marker/);
    }
    await expect(
      importOpenTaal(wordlist, version, {
        ...pins,
        wordlistManifest: { ...pins.wordlistManifest, version: '2.20.24' },
      }),
    ).rejects.toThrow(/version marker/);
    writeFileSync(path, 'huis\nhuis\n');
    const imported = await importOpenTaal(path, version, {
      ...pins,
      wordlistManifest: pinFor(pins.wordlistManifest, 'huis\nhuis\n'),
    });
    expect(imported.report).toMatchObject({ rows: 2, unique_spellings: 1, duplicate_rows: 1 });
    expect(
      checkSpelling(imported, [{ id: 'duplicate', headword: 'huis' }]).results[0].observations.map(
        (observation) => observation.source_line,
      ),
    ).toEqual([1, 2]);
  });

  it('F08: invalid entries, missing files and bad CLI flags fail explicitly', async () => {
    const imported = await importOpenTaal(wordlist, version, pins);
    for (const records of [
      {},
      [null],
      [{ id: 'id' }],
      [{ id: '', headword: 'huis' }],
      [{ id: 'id', headword: 'huis', kind: 'noun' }],
    ]) {
      expect(() => checkSpelling(imported, records)).toThrow();
    }
    for (const result of [
      cli('missing.txt'),
      cli(wordlist, version, ['--download', 'url']),
      cli(wordlist, version, ['--entries', 'missing.json']),
      cli(wordlist, version, ['--entries']),
    ]) {
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr.length).toBeGreaterThan(0);
    }
  });

  it('W18: default full-file pins preserve the research snapshot hashes and version-marker identity', () => {
    for (const name of ['wordlist', 'version']) {
      const pin = readJson(`tools/content/sources/opentaal-${name}.manifest.json`);
      const research = readJson(
        `research/content-2026-10/evidence/sources/opentaal-${name}.txt.manifest.json`,
      );
      expect(pin).toMatchObject({
        url: research.url,
        retrieved_at: research.retrieved_at,
        bytes: research.bytes,
        sha256: research.sha256,
        version: '2.20.23',
        lineage: ['OpenTaal'],
      });
    }
    expect(pins.versionManifest.sha256).toBe(hash(readFileSync(version)));
  });
});
