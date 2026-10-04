import { describe, expect, it } from 'vitest';
import { baseline, matrix, trialFor } from '../../../tests/fixtures/learning/scoring/matrix.ts';
import { classifyAttempt } from './classify.ts';

describe('assistance-aware classification', () => {
  for (const entry of matrix)
    it(entry.name, () => {
      const input = trialFor(entry);
      const before = structuredClone(input);
      expect(classifyAttempt(input)).toMatchObject({
        valid: true,
        proposedRatings: entry.ratings,
        independent: entry.independent,
        initial: entry.initial,
        declaredInitial: input.initial,
        final: input.final,
        components: input.components,
        evidenceSource: input.judgmentSource,
        verifiedSpeech: false,
      });
      expect(input).toEqual(before);
    });
  it('T03: many retries cannot produce a second rating or erase initial failure', () => {
    const result = classifyAttempt({
      ...baseline,
      initial: 'incorrect',
      final: 'correct',
      components: { ...baseline.components, form: 'incorrect' },
      supports: [3000, 4000, 5000].map((shownAt) => ({ kind: 'letters', shownAt })),
    });
    expect(result.proposedRatings).toEqual(['again']);
    expect(result.initial).toBe('incorrect');
  });
  it('T04: feedback and hints after a correct locked response are subsequent exposures', () => {
    const supports = [
      { kind: 'full_answer', shownAt: 2001 },
      { kind: 'mnemonic_image', shownAt: 3000 },
    ];
    const result = classifyAttempt({ ...baseline, supports });
    expect(result.proposedRatings).toEqual(['good']);
    expect(result.assistanceBeforeResponse).toEqual([]);
    expect(result.exposuresAfterResponse).toEqual(supports);
  });
  it('I03: simultaneous support and response lock conservatively count as assistance', () => {
    expect(
      classifyAttempt({ ...baseline, supports: [{ kind: 'letters', shownAt: 2000 }] })
        .proposedRatings,
    ).toEqual(['again']);
  });
  it('T09: duration alone cannot change any classification', () => {
    for (const entry of matrix) {
      const input = trialFor(entry);
      expect(classifyAttempt({ ...input, responseDurationMs: 0 })).toEqual(
        classifyAttempt({ ...input, responseDurationMs: 86400000 }),
      );
    }
  });
  it('I03: Easy and effort cannot promote assisted or failed attempts', () => {
    expect(
      classifyAttempt({
        ...baseline,
        advancedMode: true,
        easyChosen: true,
        effort: 'effortful',
        supports: [{ kind: 'meaning_support', shownAt: 1500 }],
      }).proposedRatings,
    ).toEqual(['again']);
    expect(
      classifyAttempt({ ...baseline, advancedMode: true, easyChosen: true, effort: 'effortful' })
        .proposedRatings,
    ).toEqual(['hard']);
  });
  it('W12: article and spelling components do not erase lexical recall', () => {
    const result = classifyAttempt({
      ...baseline,
      components: {
        meaning: 'correct',
        form: 'correct',
        article: 'incorrect',
        spelling: 'incorrect',
      },
    });
    expect(result.proposedRatings).toEqual(['good']);
    expect(result.components?.article).toBe('incorrect');
    expect(
      classifyAttempt({
        ...baseline,
        targetComponent: 'article',
        components: { ...baseline.components, article: 'incorrect' },
      }).proposedRatings,
    ).toEqual([]);
  });
  it('I09: malformed or contradictory lifecycle inputs never penalize the learner', () => {
    for (const input of [
      null,
      {},
      { ...baseline, unknown: true },
      { ...baseline, responseLockedAt: null },
      { ...baseline, responseLockedAt: 0 },
      { ...baseline, responseDurationMs: NaN },
      { ...baseline, supports: [{ kind: 'feedback', shownAt: 1500 }] },
      { ...baseline, supports: [{ kind: 'letters', shownAt: 500 }] },
      { ...baseline, supports: [{ kind: 'primary_audio_replay', shownAt: 1500 }] },
      { ...baseline, inputMode: 'spoken_self_report' },
    ]) {
      expect(classifyAttempt(input)).toMatchObject({
        valid: false,
        proposedRatings: [],
        independent: false,
        reasons: ['invalid_input'],
      });
    }
  });
});
