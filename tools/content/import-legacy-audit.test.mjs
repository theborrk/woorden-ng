// @vitest-environment node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyAnnotation,
  emptyAnnotations,
  importLegacyAudit,
  parseAuditCsv,
  undoAnnotation,
} from './import-legacy-audit.mjs';

const pins = JSON.parse(readFileSync('tools/content/sources/legacy-audit.json', 'utf8'));
const inputs = Object.fromEntries(
  Object.entries(pins).map(([key, pin]) => [key, readFileSync(pin.path)]),
);
const seed = JSON.parse(inputs.seed).entries;
const audit = importLegacyAudit(inputs);
const entry = (id) => audit.entries.find((record) => record.legacyId === id);
const receipt = (id) => ({
  legacyId: id,
  proposal_sha256: entry(id).proposal_sha256,
  verdict: 'accept',
  reviewer: 'test-only reviewer',
  run_ref: 'test-only run',
});
const hash = (value) => createHash('sha256').update(value).digest('hex');
const changedPins = (input) =>
  Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      { ...pins[key], bytes: value.length, sha256: hash(value) },
    ]),
  );

describe('legacy content audit import and annotation sidecar', () => {
  it('F08: AC1 imports all 1,946 unique IDs and byte-equivalent original RU/EN without source mutation', () => {
    expect(audit.entries.map((record) => record.legacyId)).toEqual(
      seed.map((record) => record.legacyId),
    );
    expect(new Set(audit.entries.map((record) => record.legacyId)).size).toBe(1946);
    for (const [i, record] of audit.entries.entries()) {
      expect(record.original).toEqual(seed[i]);
      expect(Buffer.from(record.original.ru)).toEqual(Buffer.from(seed[i].ru));
      expect(Buffer.from(record.original.en)).toEqual(Buffer.from(seed[i].en));
      expect(record.assessment.language_check).toBe('not_run');
      expect(record.assessment.release).toBe('blocked');
    }
    expect(audit.coverage).toEqual({
      total: 1946,
      original_ru_preserved: 1946,
      actions: { keep: 1268, fix: 554, opt_in: 122, drop_as_alias: 2 },
      annotation_reviewed: 0,
      language_checked: 0,
      release_eligible: 0,
    });
    expect(
      audit.entries.filter((record) => record.proposal.action === 'drop_as_alias'),
    ).toHaveLength(2);
    expect(
      audit.entries.every(
        (record) => record.original && record.research_evidence && record.research_csv.source,
      ),
    ).toBe(true);
    for (const pin of Object.values(pins)) expect(hash(readFileSync(pin.path))).toBe(pin.sha256);
    expect(importLegacyAudit(inputs)).toEqual(audit);
  });

  it('W20: AC2 shows het eten noun/verb contamination and proposed s160 linkage without applying it', () => {
    const record = entry('s295');
    expect(record.original.nl).toBe('het eten');
    expect(record.original.conjugation).toEqual({
      vt: 'at',
      vtp: 'aten',
      vd: 'gegeten',
      aux: 'hebben',
    });
    expect(record.proposal.noun_verb_contamination).toBe(true);
    expect(record.proposal.proposed_fix).toMatch(/Remove verb conjugation.*s160/);
    expect(record.research_evidence.checks.verb_form_checks.vt.result).toBe('matched_surface');
    expect(record.original).toEqual(seed[295]);
  });

  it('W18: AC3 preserves deksel and soort alternatives as scoped candidates, not unconditional errors', () => {
    for (const id of ['s1392', 's800']) {
      expect(entry(id).proposal.article).toMatchObject({
        original: 'het',
        candidates: ['de', 'het'],
        status: 'alternatives_need_scope',
        unconditional_error: false,
      });
      expect(entry(id).proposal.article.warning).toMatch(/No automatic replacement/);
      expect(entry(id).original.article).toBe('het');
    }
    expect(entry('s1392').proposal.proposed_fix).toContain('legacy het is valid');
    expect(entry('s800').proposal.proposed_fix).toContain('biological species uses de');
  });

  it('T50: annotation acceptance is hash-bound, reversible and never grants release or language approval', () => {
    const initial = emptyAnnotations(audit);
    const before = JSON.stringify(audit);
    const first = applyAnnotation(audit, initial, receipt('s295'));
    expect(initial.annotations).toEqual({});
    expect(first.annotations.s295).toMatchObject({
      annotation_review: 'accepted_by_supplied_receipt',
      language_check: 'not_run',
      release: 'blocked',
    });
    expect(applyAnnotation(audit, first, receipt('s295'))).toEqual(first);
    const secondReceipt = { ...receipt('s295'), run_ref: 'test-only second run' };
    const second = applyAnnotation(audit, first, secondReceipt);
    const reverted = undoAnnotation(audit, second, 's295');
    expect(reverted.annotations).toEqual(first.annotations);
    const cleared = undoAnnotation(audit, reverted, 's295');
    expect(cleared.annotations).toEqual({});
    expect(cleared.history.map((event) => event.action)).toEqual([
      'apply',
      'apply',
      'undo',
      'undo',
    ]);
    expect(() => undoAnnotation(audit, cleared, 's295')).toThrow(/No current/);
    expect(JSON.stringify(audit)).toBe(before);
    expect(() =>
      applyAnnotation(audit, initial, { ...receipt('s295'), proposal_sha256: '0'.repeat(64) }),
    ).toThrow(/hash-bound/);
    expect(() => applyAnnotation(audit, initial, { ...receipt('s295'), reviewer: '' })).toThrow(
      /receipt/,
    );
    expect(() => applyAnnotation({ ...audit, coverage: {} }, initial, receipt('s295'))).toThrow(
      /audit artifact/,
    );
    expect(() =>
      applyAnnotation(audit, { ...initial, annotations: { s295: {} } }, receipt('s295')),
    ).toThrow(/state/);
    expect(() =>
      applyAnnotation(audit, { ...initial, audit_sha256: '0'.repeat(64) }, receipt('s295')),
    ).toThrow(/state/);
  });

  it('F08: rejects missing/duplicate IDs, changed originals, mismatched decisions and damaged source bytes', () => {
    expect(() =>
      importLegacyAudit({ ...inputs, csv: Buffer.concat([inputs.csv, Buffer.from(' ')]) }),
    ).toThrow(/integrity/);
    for (const change of [
      (evidence) => evidence.pop(),
      (evidence) => {
        evidence[1].legacyId = 's0';
      },
      (evidence) => {
        evidence[295].original.ru = 'changed';
      },
      (evidence) => {
        evidence[295].decision = 'keep';
      },
    ]) {
      const evidence = JSON.parse(inputs.evidence);
      change(evidence);
      const changed = { ...inputs, evidence: Buffer.from(JSON.stringify(evidence)) };
      expect(() => importLegacyAudit(changed, changedPins(changed))).toThrow(
        /records|duplicate|disagreement/,
      );
    }
    expect(
      parseAuditCsv(
        'legacyId,nl,decision,problem,proposed fix,source\r\ns0,"a,b",fix,"a ""quote""\nand newline",proposal,source\r\n',
      )[0],
    ).toMatchObject({ nl: 'a,b', problem: 'a "quote"\nand newline' });
    for (const text of [
      'wrong,header\n',
      'legacyId,nl,decision,problem,proposed fix,source\ns0,"unterminated',
      'legacyId,nl,decision,problem,proposed fix,source\ns0,"closed"bad,fix,p,f,s',
    ])
      expect(() => parseAuditCsv(text)).toThrow();
  });

  it('F08: CLI inspects proposals, writes new artifacts, applies and undoes annotations without overwriting', () => {
    const dir = mkdtempSync(join(tmpdir(), 'woorden-audit-'));
    const cli = (...args) =>
      spawnSync(process.execPath, ['tools/content/import-legacy-audit.mjs', ...args], {
        encoding: 'utf8',
      });
    try {
      const path = join(dir, 'audit.json'),
        accepted = join(dir, 'accepted.json'),
        undone = join(dir, 'undone.json'),
        review = join(dir, 'receipt.json');
      const imported = cli('import', '--id', 's295', '--output', path);
      expect(imported.status).toBe(0);
      expect(JSON.parse(imported.stdout).entry.proposal.noun_verb_contamination).toBe(true);
      writeFileSync(review, JSON.stringify(receipt('s295')));
      expect(cli('apply', path, '-', review, '--output', accepted).status).toBe(0);
      expect(cli('undo', path, accepted, 's295', '--output', undone).status).toBe(0);
      expect(JSON.parse(readFileSync(undone, 'utf8')).annotations).toEqual({});
      const collision = cli('import', '--output', path);
      expect(collision.status).toBe(1);
      expect(collision.stdout).toBe('');
      expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(audit);
      expect(cli('import', '--id', 's9999').status).toBe(1);
      expect(cli('import', '--bad', 'value').status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
