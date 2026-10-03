import { describe, expect, it } from 'vitest';
import lesson from '../../../tests/fixtures/external-practice/lesson.json';
import claim from '../../../tests/fixtures/external-practice/observation.json';
import conflict from '../../../tests/fixtures/external-practice/observation-conflict.json';
import { ExternalPracticeObservationV1Schema, TutorSessionPackageV1Schema } from './schemas.ts';
import { classifyDuplicate } from './duplicates.ts';

describe('external practice contracts', () => {
  it('T73: AC1 preserves all lesson IDs, revision, PL/EN explanations, hints and support context', () => {
    const parsed = TutorSessionPackageV1Schema.parse(lesson);
    expect(parsed).toEqual(lesson);
    expect(parsed.lessons[0]?.helpPolicy.graduatedHints.map((hint) => hint.kind)).toEqual([
      'sound_onset',
      'letters',
      'full_answer',
    ]);
    expect(parsed.preferences.interfaceLocale).not.toBe(parsed.preferences.explanationLocale);
  });

  it('T73: AC2 preserves explicit unknown assistance and classifies repeated IDs without mutation', () => {
    const observation = ExternalPracticeObservationV1Schema.parse(claim);
    const differing = ExternalPracticeObservationV1Schema.parse(conflict);
    const previous = Object.freeze([observation]);
    expect(observation.helpUsed).toEqual({ status: 'unknown' });
    expect(classifyDuplicate(observation, [])).toBe('new');
    expect(classifyDuplicate(observation, previous)).toBe('identical');
    expect(classifyDuplicate(differing, previous)).toBe('conflict');
    expect(classifyDuplicate(observation, [observation, differing])).toBe('conflict');
    expect(classifyDuplicate({ ...observation, id: 'another-opaque-id' }, previous)).toBe('new');
    expect(observation).toEqual(claim);
  });

  it('T73: distinguishes known no help from unknown help and validates reported assistance', () => {
    expect(
      ExternalPracticeObservationV1Schema.parse({
        ...claim,
        helpUsed: { status: 'known', assistance: [] },
      }).helpUsed,
    ).toEqual({ status: 'known', assistance: [] });
    const assistance = [{ kind: 'letters', shownAt: claim.occurredAt }];
    expect(
      ExternalPracticeObservationV1Schema.parse({
        ...claim,
        helpUsed: { status: 'known', assistance },
      }).helpUsed,
    ).toEqual({ status: 'known', assistance });
    for (const helpUsed of [
      undefined,
      {},
      { status: 'unknown', assistance: [] },
      { status: 'known' },
      { status: 'known', assistance: [{ kind: 'invented', shownAt: 0 }] },
    ]) {
      expect(() => ExternalPracticeObservationV1Schema.parse({ ...claim, helpUsed })).toThrow();
    }
  });

  it.each([
    'scheduler',
    'scheduling',
    'fsrs',
    'nativeCard',
    'rating',
    'expectedStateHash',
    'commitKey',
  ])(
    'I23: AC3 rejects supplied graded-attempt/scheduler field %s instead of stripping it',
    (field) => {
      expect(() => ExternalPracticeObservationV1Schema.parse({ ...claim, [field]: {} })).toThrow(
        /unknown field/,
      );
    },
  );

  it('I23: AC3 rejects attempt_committed and nested scheduler state; claims retain a distinct discriminator', () => {
    expect(() =>
      ExternalPracticeObservationV1Schema.parse({ ...claim, kind: 'attempt_committed' }),
    ).toThrow();
    expect(() =>
      ExternalPracticeObservationV1Schema.parse({ ...claim, attempt_committed: true }),
    ).toThrow();
    expect(() =>
      ExternalPracticeObservationV1Schema.parse({
        ...claim,
        reportingSource: { ...claim.reportingSource, scheduler: {} },
      }),
    ).toThrow(/unknown field/);
    expect(ExternalPracticeObservationV1Schema.parse(claim).kind).toBe(
      'external_practice_observation',
    );
  });

  it('T73: rejects malformed versions, time, locales, hashes and lesson context', () => {
    for (const patch of [
      { schemaVersion: 2 },
      { createdAt: -1 },
      { createdAt: 0.5 },
      { createdAt: Infinity },
      { contentRevision: '' },
      { lessons: [] },
      { preferences: { ...lesson.preferences, cueLocale: 'ru' } },
    ]) {
      expect(() => TutorSessionPackageV1Schema.parse({ ...lesson, ...patch })).toThrow();
    }
    for (const patch of [
      { payloadVersion: 0 },
      { payloadVersion: 1.5 },
      { payloadHash: 'not-a-hash' },
      { occurredAt: NaN },
      { reportedOutcome: 'good' },
    ]) {
      expect(() => ExternalPracticeObservationV1Schema.parse({ ...claim, ...patch })).toThrow();
    }
    for (const input of [null, [], 'observation']) {
      expect(() => ExternalPracticeObservationV1Schema.parse(input)).toThrow();
    }
  });
});
