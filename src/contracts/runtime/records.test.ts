// @vitest-environment node
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import golden from '../../../tests/fixtures/runtime/canonical-golden.json';
import {
  fixture,
  fixtureNames,
  rejectionCases,
  reverseKeys,
} from '../../../tests/fixtures/runtime/support.ts';
import { allocateIdentity, FieldError, validateRecord } from './records.ts';
import { canonicalRecord } from './canonical.ts';

function nested(input: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = input[key];
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected nested fixture');
  return value as Record<string, unknown>;
}
function rejects(input: unknown, field: string) {
  try {
    validateRecord(input);
  } catch (error) {
    expect(error).toBeInstanceOf(FieldError);
    expect(error).toHaveProperty('field', field);
    return;
  }
  throw new Error(`Accepted invalid input at ${field}`);
}

describe('runtime boundary contracts', () => {
  for (const name of fixtureNames) {
    it(`I12: validates and freezes the versioned ${name} fixture without mutating input`, () => {
      const input = fixture(name);
      const before = JSON.stringify(input);
      const output = validateRecord(input);
      expect(output).toEqual(input);
      expect(JSON.stringify(input)).toBe(before);
      expect(Object.isFrozen(output)).toBe(true);
      if ('promptContext' in output)
        expect(Object.isFrozen(output.promptContext.answerTexts)).toBe(true);
      // Every supplied field is checked, rather than silently stripped.
      for (const key of Object.keys(input)) {
        const nestedObject =
          input[key] !== null && typeof input[key] === 'object' && !Array.isArray(input[key]);
        rejects(
          { ...input, [key]: { invalid: true } },
          `$/` + key + (nestedObject ? '/invalid' : ''),
        );
      }
    });
  }
  for (const name of ['profile', 'task', 'session', 'event'] as const) {
    it(`I12: AC1 ${name} has stable IDs, canonical UTF-8 and golden SHA-256 across key order`, () => {
      const input = fixture(name);
      const first = canonicalRecord(input);
      const reversed = canonicalRecord(reverseKeys(input));
      expect(reversed).toEqual(first);
      expect(first.record).toEqual(input);
      expect(first.canonical).toBe(golden[name].canonical);
      expect(createHash('sha256').update(first.bytes).digest('hex')).toBe(golden[name].sha256);
      expect(new TextDecoder().decode(first.bytes)).toBe(first.canonical);
    });
  }
  for (const { name, patch, field } of rejectionCases) {
    it(`I12: AC2 reports ${field} for ${JSON.stringify(patch)}`, () =>
      rejects({ ...fixture(name), ...patch }, field));
  }
  it('I14: AC3 EN preferences round-trip without relabeling PL history, due time or eligibility', () => {
    const history = canonicalRecord(fixture('event'));
    const progress = canonicalRecord(fixture('progress'));
    const input = { ...fixture('preferences'), interfaceLocale: 'pl' };
    const before = validateRecord(input);
    const after = validateRecord(
      JSON.parse(canonicalRecord({ ...input, interfaceLocale: 'en' }).canonical),
    );
    expect(after).toEqual({ ...before, interfaceLocale: 'en' });
    expect(after).toHaveProperty('cueLocale', 'pl');
    expect(history.record).toHaveProperty('promptContext.cueLocale', 'pl');
    expect(history.record).toHaveProperty('promptContext.promptText', 'ja — I — я');
    expect(canonicalRecord(history.record)).toEqual(history);
    expect(canonicalRecord(progress.record)).toEqual(progress);
    expect(progress.record).toHaveProperty('scheduler.rawDueAt', 1767269400000);
    expect(progress.record).toHaveProperty('eligibility.eligibleAt', 1767290400000);
    expect(progress.record).toHaveProperty('evidenceStatus', 'acquiring');
  });
  it('I12: AC4 shared attempt IDs allow assistance/exposure, only a final attempt carries its commit key', () => {
    const final = validateRecord(fixture('event'));
    for (const name of ['assistance', 'exposure']) {
      const input = fixture(name);
      const event = validateRecord(input);
      expect(event).toHaveProperty('attemptId', fixture('event').attemptId);
      expect(event).not.toHaveProperty('commitKey');
      for (const commitKey of ['', null, fixture('event').commitKey])
        rejects({ ...input, commitKey }, '$/commitKey');
    }
    expect(final).toHaveProperty(
      'commitKey',
      `${String(fixture('event').profileId)}:${String(fixture('event').attemptId)}`,
    );
    rejects({ ...fixture('event'), commitKey: '' }, '$/commitKey');
    rejects({ ...fixture('event'), commitKey: 'foreign-key' }, '$/commitKey');
    rejects({ ...fixture('event'), commitKey: undefined }, '$/commitKey');
  });
  it('I12: AC4 external claims cannot masquerade as app-observed events', () => {
    rejects({ ...fixture('event'), kind: 'external_claim' }, '$/kind');
    rejects({ ...fixture('event'), provider: 'tutor', provenance: 'external' }, '$/provider');
    const input = fixture('event');
    nested(input, 'result').judgmentSource = 'external_tutor';
    rejects(input, '$/result/judgmentSource');
    rejects({ ...fixture('exposure'), scheduling: fixture('event').scheduling }, '$/scheduling');
  });
  it('I12: rejects hostile timestamps, calendar dates, locales, IDs and prototype keys', () => {
    for (const occurredAt of [NaN, Infinity, 1.5, 8_640_000_000_000_001, '2026-01-01'])
      rejects({ ...fixture('event'), occurredAt }, '$/occurredAt');
    for (const studyDate of ['2026-02-30', '2026-13-01', 'not-a-date'])
      rejects({ ...fixture('event'), studyDate }, '$/studyDate');
    rejects({ ...fixture('preferences'), timeZone: 'Invalid/Zone' }, '$/timeZone');
    rejects({ ...fixture('preferences'), interfaceLocale: 'ru' }, '$/interfaceLocale');
    rejects({ ...fixture('task'), id: 's0' }, '$/id');
    rejects({ ...fixture('profile'), name: '\ud800' }, '$/name');
    rejects({ ...fixture('task'), cueLocale: undefined }, '$/cueLocale');
    rejects(JSON.parse('{"kind":"profile","__proto__":{}}'), '$/__proto__');
    rejects({ kind: 'constructor' }, '$/kind');
  });
  it('I12: validates nested independent versions and pinned numeric native FSRS serialization', () => {
    const input = fixture('scheduler');
    const scheduler = nested(input, 'scheduler');
    const card = nested(scheduler, 'nativeCard');
    for (const [key, value] of [
      ['serializationVersion', 2],
      ['packageVersion', '6.0.0'],
      ['rawDueAt', 0],
      ['phase', 'review'],
      ['scheduledDays', 1],
    ] as const) {
      rejects({ ...input, scheduler: { ...scheduler, [key]: value } }, `$/scheduler/${key}`);
    }
    for (const [key, value] of [
      ['state', 'Learning'],
      ['due', '2026-02-30T12:00:00.000Z'],
      ['last_review', undefined],
      ['difficulty', 11],
      ['reps', -1],
    ] as const) {
      rejects(
        { ...input, scheduler: { ...scheduler, nativeCard: { ...card, [key]: value } } },
        `$/scheduler/nativeCard/${key}`,
      );
    }
    const newCard = { ...card, state: 0, reps: 0, last_review: undefined };
    expect(
      validateRecord({ ...input, scheduler: { ...scheduler, phase: 'new', nativeCard: newCard } }),
    ).toHaveProperty('scheduler.phase', 'new');
    const parameters = fixture('parameters');
    rejects(
      { ...parameters, parameters: { ...nested(parameters, 'parameters'), w: [1] } },
      '$/parameters/w',
    );
  });
  it('I12: requires retained prompt answers and matching historical versions', () => {
    const input = fixture('event');
    const context = nested(input, 'promptContext');
    for (const [key, value] of [
      ['contextVersion', 2],
      ['contentVersion', 'deleted-2'],
      ['gradingContractVersion', 2],
      ['answerIds', []],
      ['promptText', ''],
    ] as const) {
      rejects({ ...input, promptContext: { ...context, [key]: value } }, `$/promptContext/${key}`);
    }
  });
  it('I12: identity and time allocation are injected and inspection preserves IDs', () => {
    const input = fixture('profile');
    expect(
      allocateIdentity(
        () => input.id,
        () => input.createdAt,
      ),
    ).toEqual({ id: input.id, createdAt: input.createdAt });
    expect(() =>
      allocateIdentity(
        () => 's0',
        () => 0,
      ),
    ).toThrow('$/id');
    expect(() =>
      allocateIdentity(
        () => input.id,
        () => Infinity,
      ),
    ).toThrow('$/createdAt');
    expect(canonicalRecord(input).record).toHaveProperty('id', input.id);
  });
});
