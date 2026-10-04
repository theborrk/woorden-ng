import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importWord, requestDefaultForm } from './import-kaikki-en.mjs';

const fixturePath = resolve('tests/fixtures/content-sources/kaikki-en-small.jsonl');
const fixtureManifest = JSON.parse(
  readFileSync(resolve('tests/fixtures/content-sources/kaikki-en-small.manifest.json'), 'utf8'),
);

async function importFixture(word) {
  return importWord({ sourcePath: fixturePath, sourceManifest: fixtureManifest, word });
}

describe('Kaikki English-edition Dutch importer', () => {
  it('T44: keeps opstaan joined and split forms distinct and excludes table metadata', async () => {
    const { entries } = await importFixture('opstaan');
    const entry = entries[0];
    expect(entry.forms).toContainEqual(
      expect.objectContaining({ surface: 'opstaan', kind: 'joined-infinitive' }),
    );
    expect(entry.forms).toContainEqual(
      expect.objectContaining({
        surface: 'sta op',
        kind: 'split-main-clause-present-first-person-singular',
      }),
    );
    expect(
      entry.forms.some((form) => form.surface === 'sta op' && form.kind === 'joined-infinitive'),
    ).toBe(false);
    expect(entry.forms.map((form) => form.surface)).not.toContain('irregular separable strong');
    expect(entry.forms.map((form) => form.surface)).not.toContain('nl-conj-st');
    expect(entry.forms.map((form) => form.surface)).not.toContain('6');
    expect(entry.excluded_forms.map((form) => form.surface)).toEqual(
      expect.arrayContaining(['irregular separable strong', 'nl-conj-st', '6']),
    );
    expect(entry.excluded_forms.every((form) => form.source.record_sha256.length === 64)).toBe(
      true,
    );
  });

  it('T44: requires an explicit source scope when modern and regional or archaic variants coexist', async () => {
    const { entries } = await importFixture('werken');
    const entry = entries[0];
    const decision = requestDefaultForm(entry, 'unscoped-past-second-person-singular');
    expect(decision.status).toBe('choice_required');
    expect(decision.choices.some((form) => form.tags.includes('archaic'))).toBe(true);
    expect(decision.choices.some((form) => form.tags.includes('Flanders'))).toBe(true);

    const modern = entry.forms.find(
      (form) => form.surface === 'werkte' && form.kind === 'unscoped-past-second-person-singular',
    );
    expect(modern).toBeDefined();
    expect(
      requestDefaultForm(entry, modern.kind, {
        record_sha256: modern.source.record_sha256,
        selector: modern.source.selector,
      }),
    ).toEqual({
      status: 'selected',
      form: modern,
      scope: {
        record_sha256: modern.source.record_sha256,
        selector: modern.source.selector,
      },
    });
  });

  it('T43: leaves IPA missing when the source has no IPA transcription', async () => {
    const { entries } = await importFixture('trade');
    expect(entries[0].ipa).toEqual([]);
    expect(entries[0]).not.toHaveProperty('ipa_transcription');
  });

  it('T44: retains source record hashes and rejects an excerpt whose bytes changed', async () => {
    const { entries, report } = await importFixture('opstaan');
    const sourceLine = readFileSync(fixturePath, 'utf8')
      .split('\n')
      .find((line) => JSON.parse(line).word === 'opstaan');
    expect(entries[0].source.record_sha256).toBe(
      createHash('sha256').update(`${sourceLine}\n`).digest('hex'),
    );
    expect(report.source_sha256).toBe(fixtureManifest.sha256);
    await expect(
      importWord({
        sourcePath: fixturePath,
        word: 'opstaan',
        sourceManifest: { ...fixtureManifest, sha256: '0'.repeat(64) },
      }),
    ).rejects.toThrow(/Source integrity check failed/);
  });
});
