// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it } from 'vitest';
import {
  extractFixture,
  readSeed,
  serializeFixture,
  validateFixture,
} from './extract-legacy-seed.mjs';

const html = readFileSync('legacy/index.html', 'utf8');
const committed = readFileSync('content/legacy/seed-v1.json', 'utf8');
const fixture = JSON.parse(committed);
const directories = [];
afterEach(() =>
  directories.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })),
);

function workspace() {
  const dir = mkdtempSync(join(tmpdir(), 'legacy-seed-'));
  directories.push(dir);
  mkdirSync(join(dir, 'tools/content'), { recursive: true });
  mkdirSync(join(dir, 'legacy'));
  cpSync(
    'tools/content/extract-legacy-seed.mjs',
    join(dir, 'tools/content/extract-legacy-seed.mjs'),
  );
  writeFileSync(join(dir, 'legacy/index.html'), html);
  return dir;
}

describe('legacy seed fixture', () => {
  it('AC1: two extractor runs produce bytes identical to the committed fixture', () => {
    const cwd = workspace();
    for (let i = 0; i < 2; i++) {
      execFileSync(process.execPath, ['tools/content/extract-legacy-seed.mjs'], { cwd });
      expect(readFileSync(join(cwd, 'content/legacy/seed-v1.json'), 'utf8')).toBe(committed);
    }
    expect(
      execFileSync(process.execPath, ['tools/content/extract-legacy-seed.mjs', '--validate'], {
        cwd,
        encoding: 'utf8',
      }),
    ).toContain('matches the source hash and all entries');
    expect(fixture.source).toMatchObject({
      path: 'legacy/index.html',
      baselineCommit: 'e66ad1551a91ee31fe354a33a03cbfff4a66030d',
    });
    expect(() => validateFixture(html, committed)).not.toThrow();
  });

  it('AC2: reproduces every section 3 baseline count', () => {
    const entries = fixture.entries;
    const defaults = entries.filter((entry) => entry.theme !== 'slang');
    const count = (items, predicate) => items.filter(predicate).length;
    expect({
      total: entries.length,
      slang: count(entries, (e) => e.theme === 'slang'),
      defaults: defaults.length,
      examples: count(entries, (e) => e.example !== ''),
      articles: count(entries, (e) => e.article !== null),
      defaultArticles: count(defaults, (e) => e.article !== null),
      de: count(defaults, (e) => e.article === 'de'),
      het: count(defaults, (e) => e.article === 'het'),
      conjugations: count(entries, (e) => e.conjugation !== null),
      agro: count(entries, (e) => e.theme === 'agro'),
    }).toEqual({
      total: 1946,
      slang: 35,
      defaults: 1911,
      examples: 169,
      articles: 1005,
      defaultArticles: 993,
      de: 712,
      het: 281,
      conjugations: 163,
      agro: 191,
    });
  });

  it('AC3: preserves positional IDs and all original values including Russian and nulls', () => {
    // Independently read the frozen declaration; pad only the absent optional fields.
    const start = html.indexOf('[', html.indexOf('const SEED = ['));
    const end = html.indexOf('\n];', start) + 2;
    const original = runInNewContext(`(${html.slice(start, end)})`, Object.create(null), {
      timeout: 1000,
    });
    const rows = fixture.entries.map((e, i) => {
      expect(e.legacyId).toBe(`s${i}`);
      return [e.nl, e.article, e.ru, e.en, e.pos, e.example, e.conjugation, e.theme];
    });
    expect(rows).toEqual(
      original.map((row) => [...row.slice(0, 6), row[6] ?? null, row[7] ?? null]),
    );
    expect(rows[0]).toEqual([
      'de afspraak',
      'de',
      'договорённость, встреча',
      'appointment',
      'zn',
      'Ik heb morgen een afspraak bij de tandarts.',
      null,
      null,
    ]);
    expect(rows.at(-1)).toEqual([
      'vertrekken',
      null,
      'уезжать, отправляться',
      'to leave, depart',
      'ww',
      '',
      { vt: 'vertrok', vtp: 'vertrokken', vd: 'vertrokken', aux: 'zijn' },
      null,
    ]);
    expect(fixture.entries.find((e) => e.nl === 'zijn')).toEqual({
      legacyId: 's120',
      nl: 'zijn',
      ru: 'быть',
      en: 'to be',
      pos: 'ww',
      example: '',
      conjugation: { vt: 'was', vtp: 'waren', vd: 'geweest', aux: 'zijn' },
      article: null,
      theme: null,
    });
    expect(fixture.entries.find((e) => e.nl === 'gezellig' && e.theme === 'slang')).toEqual({
      legacyId: 's1139',
      nl: 'gezellig',
      article: null,
      pos: 'bn',
      example: '',
      theme: 'slang',
      ru: 'уютный, приятный (в компании)',
      en: 'cosy, convivial',
      conjugation: null,
    });
  });

  it('AC4: validation rejects a modified source copy and reports the hash mismatch', () => {
    const cwd = workspace();
    execFileSync(process.execPath, ['tools/content/extract-legacy-seed.mjs'], { cwd });
    writeFileSync(join(cwd, 'legacy/index.html'), `${html}\n<!-- modified source -->\n`);
    const result = spawnSync(
      process.execPath,
      ['tools/content/extract-legacy-seed.mjs', '--validate'],
      { cwd, encoding: 'utf8' },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(
      /Source hash mismatch: fixture [a-f0-9]{64}, source [a-f0-9]{64}/,
    );
  });

  it('rejects changed fixture data, metadata and serialization with a readable message', () => {
    for (const change of [
      (f) => {
        f.entries[0].ru = 'changed';
      },
      (f) => {
        f.source.baselineCommit = 'changed';
      },
      (f) => {
        f.entries[0].legacyId = 's999';
      },
    ]) {
      const copy = JSON.parse(committed);
      change(copy);
      expect(() => validateFixture(html, serializeFixture(copy))).toThrow(/fixture is out of date/);
    }
    expect(() => validateFixture(html, committed.trim())).toThrow(/fixture is out of date/);
  });

  it('isolates seed evaluation and never executes surrounding HTML code', () => {
    const declaration = 'const SEED = [\n["woord",null,"слово","word","zn",""]\n];';
    expect(
      extractFixture(`throw new Error('before');\n${declaration}\nthrow new Error('after');`)
        .entries,
    ).toHaveLength(1);
    for (const code of [
      'process.exit()',
      'require("node:fs")',
      'globalThis.constructor.constructor("return process")()',
    ]) {
      expect(() => readSeed(`const SEED = [\n${code}\n];`)).toThrow();
    }
    expect(() => readSeed('const SEED = [\n(()=>{while(true){}})()\n];')).toThrow(/timed out/);
    expect(() => readSeed('no seed')).toThrow(/Cannot find the SEED/);
    expect(() => readSeed('const SEED = [\n["bad"]\n];')).toThrow(/Invalid SEED entry s0/);
  });

  it('AC5: inventory covers features and storage keys with valid source line references', () => {
    const inventory = readFileSync('docs/content/legacy-inventory.md', 'utf8');
    for (const feature of [
      'Study',
      'Browse',
      'de/het',
      'Conjugation',
      'TTS',
      'Themes',
      'Settings',
      'Export/import',
      'husky',
    ])
      expect(inventory).toContain(feature);
    for (const key of ['woorden.progress', 'woorden.settings', 'woorden.meta', 'woorden.custom'])
      expect(inventory).toContain(key);
    const links = [...inventory.matchAll(/\.\.\/\.\.\/legacy\/index\.html#L(\d+)-L(\d+)/g)];
    expect(links.length).toBeGreaterThanOrEqual(13);
    for (const [, first, last] of links) {
      expect(Number(first)).toBeGreaterThan(0);
      expect(Number(last)).toBeGreaterThanOrEqual(Number(first));
      expect(Number(last)).toBeLessThanOrEqual(html.split('\n').length);
    }
  });
});
