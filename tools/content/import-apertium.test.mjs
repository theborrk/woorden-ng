// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compareApertium, parseApertium, run } from './import-apertium.mjs';

const directory = 'tests/fixtures/content-sources/apertium/';
const bytes = readFileSync(`${directory}excerpt.xml`);
const manifest = JSON.parse(readFileSync(`${directory}manifest.json`, 'utf8'));
const records = JSON.parse(readFileSync(`${directory}records.json`, 'utf8'));
const hash = (raw) => createHash('sha256').update(raw).digest('hex');
const parsed = () => parseApertium(bytes, manifest);

describe('optional Apertium observations', () => {
  it('W18: AC1 counts only active section entries and retains exact pinned record hashes', () => {
    const imported = parsed();
    expect(imported.report).toEqual({ active_entries: 5, distinct_lemmas: 3 });
    expect(imported.entries.map((e) => e.lemma)).toEqual([
      'auto',
      'landbouw',
      'opstaan',
      'opstaan',
      'opstaan',
    ]);
    expect(imported.entries.map((e) => e.source.record_sha256)).toEqual(
      records.slice(1).map((r) => r.record_sha256),
    );
    expect(imported.entries.every((e) => hash(e.raw_xml) === e.source.record_sha256)).toBe(true);
    expect(imported.entries[1].features).toEqual([
      { paradigm_id: 'LWOO__n_nt', gender: 'nt', separable: null },
    ]);
    expect(imported.entries[2].features[0].separable).toBe(true);
  });

  it('W20: AC2 surfaces landbouw gender disagreement without correcting primary evidence', () => {
    // Synthetic cited primary observation exercises the comparison boundary; not a dictionary excerpt.
    const primary = Object.freeze({
      lemma: 'landbouw',
      gender: 'm',
      forms: ['landbouw'],
      source: Object.freeze({
        source_id: 'synthetic-primary',
        record_sha256: hash('primary fixture'),
      }),
    });
    const before = JSON.stringify(primary);
    const [result] = compareApertium(parsed(), [primary]);
    expect(result.disagreements).toEqual([
      expect.objectContaining({
        field: 'gender',
        primary: 'm',
        apertium: 'nt',
        paradigm_id: 'LWOO__n_nt',
      }),
    ]);
    expect(result.primary).toEqual(primary);
    expect(JSON.stringify(primary)).toBe(before);
    expect(result.action).toBe('inspect_only');
    expect(result.language_check).toBe('not_run');
    expect(result.lineage_caveat).toMatch(/not independent/);
    expect(result.observations[0].raw_xml).toContain('lm="landbouw"');
  });

  it('W18: missing and unknown paradigms do not invent features or disagreements', () => {
    const xml = Buffer.from(
      '<dictionary><pardefs><pardef n="x"><e lm="ignored"/></pardef></pardefs><section id="s"><e lm="x"><par n="unknown"/></e><e lm="empty"/></section></dictionary>',
    );
    const imported = parseApertium(xml, { ...manifest, bytes: xml.length, sha256: hash(xml) });
    expect(imported.report.active_entries).toBe(2);
    expect(imported.entries[0].features).toEqual([
      { paradigm_id: 'unknown', gender: null, separable: null },
    ]);
    const source = { source_id: 'synthetic', record_sha256: hash('synthetic') };
    expect(
      compareApertium(imported, [{ lemma: 'x', gender: 'nt', source }])[0].disagreements,
    ).toEqual([]);
    expect(
      compareApertium(parsed(), [{ lemma: 'auto', gender: 'mf', source }])[0].disagreements,
    ).toEqual([]);
    expect(
      compareApertium(parsed(), [{ lemma: 'opstaan', separable: false, source }])[0].disagreements,
    ).toHaveLength(3);
    expect(
      compareApertium(parsed(), [{ lemma: 'missing', gender: 'm', source }])[0].observations,
    ).toEqual([]);
  });

  it('W18: rejects changed bytes, malformed XML, unsafe declarations and uncited input', () => {
    expect(() => parseApertium(Buffer.concat([bytes, Buffer.from(' ')]), manifest)).toThrow(
      /integrity/,
    );
    for (const text of [
      '<dictionary><section>',
      '<!DOCTYPE dictionary SYSTEM "file:///private"><dictionary/>',
      '<wrong/>',
      '<dictionary><section><e><par/></e></section></dictionary>',
    ]) {
      const invalid = Buffer.from(text);
      expect(() =>
        parseApertium(invalid, { ...manifest, bytes: invalid.length, sha256: hash(invalid) }),
      ).toThrow();
    }
    expect(() => compareApertium(parsed(), [{ lemma: 'landbouw', gender: 'm' }])).toThrow(/cited/);
    expect(() => run([])).toThrow(/Usage/);
    expect(() => run(['file', '--bad', 'value'])).toThrow(/arguments/);
  });
});
