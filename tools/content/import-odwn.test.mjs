import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseOdwnXml } from './import-odwn.mjs';

const fixturePath = resolve('tests/fixtures/content-sources/odwn-1.4-excerpt.xml');
const hashesPath = resolve('tests/fixtures/content-sources/odwn-1.4-excerpt.record-hashes.json');
const xml = await readFile(fixturePath, 'utf8');
const expectedHashes = JSON.parse(await readFile(hashesPath, 'utf8'));
const report = parseOdwnXml(xml);
const byId = new Map(report.records.map((record) => [record.id, record]));

describe('ODWN explicit morphology importer', () => {
  it('W18: keeps huis-n-1 explicit het and reports its conflicting gender-like metadata', () => {
    const huis = byId.get('huis-n-1');

    expect(huis.articles).toContainEqual(
      expect.objectContaining({
        written_form: 'huis',
        state: 'explicit',
        raw_article: 'het',
        alternatives: ['het'],
      }),
    );
    expect(huis.conflicts).toContainEqual(
      expect.objectContaining({
        kind: 'explicit-article-vs-gender-like-metadata',
        explicit_article: 'het',
        gender_like_metadata: 'm_f',
        xml_pointers: expect.arrayContaining([
          '/LexicalEntry[@id="huis-n-1"]/WordForms/WordForm[1]',
          '/LexicalEntry[@id="huis-n-1"]/MorphoSyntax/@pronominalAndGrammaticalGender',
        ]),
      }),
    );
    expect(huis.plurals).toContainEqual(expect.objectContaining({ written_form: 'huizen' }));
  });

  it('W18: preserves de/het alternatives and records missing articles without guessing', () => {
    expect(byId.get('EGA-n-1').articles).toContainEqual(
      expect.objectContaining({
        state: 'alternatives',
        raw_article: 'de/het',
        alternatives: ['de', 'het'],
      }),
    );
    expect(byId.get('surrealistische-n-1').articles).toContainEqual(
      expect.objectContaining({
        state: 'missing',
        raw_article: null,
        alternatives: [],
      }),
    );
  });

  it('W20: exports exact provenance, record pointers, and unassessed source independence', () => {
    const huis = byId.get('huis-n-1');
    const auto = byId.get('surrealistische-n-1');
    const verb = byId.get('aaien-v-1');

    expect(huis.source_lineage.sense_provenance[0]).toEqual(
      expect.objectContaining({
        id: 'r_n-17335',
        provenance: 'cdb2.2_Manual+omegawiki',
        lineage: 'rbn-cornetto',
        independence: 'not_assessed',
        xml_pointer: '/LexicalEntry[@id="huis-n-1"]/Sense[@id="r_n-17335"]',
      }),
    );
    expect(auto.source_lineage.sense_provenance[0]).toEqual(
      expect.objectContaining({ provenance: 'google', lineage: 'automatic' }),
    );
    expect(report.independence).toBe('not_assessed');
    expect(report).not.toHaveProperty('independent_source_count');
    expect(verb.morphosyntax.auxiliaries).toContainEqual(
      expect.objectContaining({ value: 'hebben' }),
    );
    expect(byId.get('aanbakken-v-1').separability).toBe('separable');
    expect(byId.get('troep-n-9').source_lineage.sense_provenance[0].lineage).toBe('wiktionary');
  });

  it('W18: retains stable hashes for the committed source excerpts', () => {
    expect(
      Object.fromEntries(report.records.map(({ id, record_sha256 }) => [id, record_sha256])),
    ).toEqual(expectedHashes);
    expect(
      report.records.every((record) => record.xml_pointer.startsWith('/LexicalEntry[@id=')),
    ).toBe(true);
  });

  it('W18: exports selected records without changing complete-file counters', () => {
    const selected = parseOdwnXml(xml, {
      recordFilter: (record) => record.id === 'huis-n-1',
    });

    expect(selected.lexical_entries).toBe(report.lexical_entries);
    expect(selected.records.map((record) => record.id)).toEqual(['huis-n-1']);
    expect(selected.records[0].source_lineage.sense_provenance[0].xml_pointer).toContain(
      '/Sense[@id="r_n-17335"]',
    );
  });
});
