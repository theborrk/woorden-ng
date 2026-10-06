import { describe, expect, it } from 'vitest';
import fixture from '../../../tests/fixtures/learning/answers/house.json';
import { evaluateAnswer } from './evaluate.ts';
const contract = fixture.contract;
const accepted = (surface: string) => [{ ordered_segments: [surface], case_sensitive: false }];
describe('explicit typed-answer contract', () => {
  it('T10: AC1 explicit NFC, spacing and permitted edge punctuation match while accents/endings stay meaningful', () => {
    const c = { ...contract, accepted_answers: accepted('één huis') };
    for (const response of ['e\u0301e\u0301n\t huis!', '  één   huis.  ', 'één\n huis'])
      expect(evaluateAnswer(c, response).judgment).toBe('correct');
    for (const response of ['een huis', 'één huizen', 'één-huis', 'één huis,'])
      expect(evaluateAnswer(c, response).judgment).toBe('incorrect');
    expect(evaluateAnswer({ ...c, permittedEdgePunctuation: [] }, 'één huis!').judgment).toBe(
      'incorrect',
    );
    expect(
      evaluateAnswer(
        { ...c, accepted_answers: [{ ordered_segments: ['één', 'huis'], case_sensitive: true }] },
        'Één huis',
      ).judgment,
    ).toBe('incorrect');
  });
  it('T11: AC2 an evidenced valid alternative to an ambiguous cue needs repair; precise mismatch is a target error', () => {
    const c = {
      ...contract,
      ambiguousCue: true,
      alternatives: [
        {
          surface: 'woning',
          senseId: '604c9517-d603-45ca-b859-4e98dd122cbf',
          validInContext: true,
          evidenceRef: 'synthetic-contract-test',
        },
      ],
    };
    expect(evaluateAnswer(c, 'woning')).toMatchObject({
      judgment: 'ungradable',
      components: { lexical: 'not_tested', meaning: 'not_tested' },
      reasons: ['valid_alternative_requires_prompt_repair'],
    });
    expect(evaluateAnswer({ ...c, ambiguousCue: false }, 'woning')).toMatchObject({
      judgment: 'incorrect',
      components: { lexical: 'incorrect', meaning: 'incorrect' },
      reasons: ['alternative_wrong_for_precise_context'],
    });
    expect(
      evaluateAnswer(
        { ...c, alternatives: [{ ...c.alternatives[0]!, validInContext: false }] },
        'woning',
      ).judgment,
    ).toBe('incorrect');
  });
  it('T12: AC3 another real word a single character away yields a suggestion without acceptance', () => {
    expect(evaluateAnswer(contract, 'huid')).toMatchObject({
      judgment: 'incorrect',
      components: { lexical: 'incorrect' },
      suggestedAnswers: ['huis'],
      reasons: ['known_word_not_target', 'possible_typo_suggestion_only'],
    });
    for (const response of ['hui', 'hulis'])
      expect(evaluateAnswer(contract, response)).toMatchObject({
        judgment: 'incorrect',
        suggestedAnswers: ['huis'],
      });
    expect(evaluateAnswer(contract, 'huiz')).toMatchObject({
      judgment: 'incorrect',
      suggestedAnswers: ['huis'],
    });
    expect(evaluateAnswer(contract, 'huizen').suggestedAnswers).toEqual([]);
  });
  it('T10: AC4 lexical recall remains visible alongside wrong article and strict spelling failure', () => {
    expect(evaluateAnswer(contract, 'de huis')).toMatchObject({
      judgment: 'correct',
      components: {
        lexical: 'correct',
        meaning: 'correct',
        article: 'incorrect',
        spelling: 'correct',
      },
    });
    expect(evaluateAnswer({ ...contract, articleRequired: true }, 'huis').components.article).toBe(
      'incorrect',
    );
    expect(evaluateAnswer(contract, 'het huis').components.article).toBe('correct');
    expect(evaluateAnswer({ ...contract, strictSpelling: true }, 'Huis')).toMatchObject({
      judgment: 'incorrect',
      components: { lexical: 'correct', spelling: 'incorrect' },
    });
    expect(evaluateAnswer({ ...contract, family: 'spelling' }, 'Huis').judgment).toBe('incorrect');
    expect(evaluateAnswer({ ...contract, acceptedArticles: [] }, 'de huis').judgment).toBe(
      'incorrect',
    );
  });
  it('T10: AC4 receptive text uses recorded equivalents or requests self-assessment without invented exact grading', () => {
    expect(evaluateAnswer({ ...contract, selfGraded: true }, 'huis')).toMatchObject({
      judgment: 'self_assessment_required',
      reasons: ['self_graded_contract'],
    });
    const c = {
      ...contract,
      family: 'receptive',
      reviewedEquivalents: [{ surface: 'house', evidenceRef: 'synthetic-reviewed-equivalent' }],
    };
    expect(evaluateAnswer(c, 'House!')).toMatchObject({
      judgment: 'correct',
      components: { meaning: 'correct', lexical: 'not_tested' },
    });
    for (const response of ['home', 'huis', ''])
      expect(evaluateAnswer(c, response)).toMatchObject({
        judgment: 'self_assessment_required',
        components: { meaning: 'not_tested' },
      });
    expect(evaluateAnswer({ ...c, reviewedEquivalents: [] }, 'house').judgment).toBe(
      'self_assessment_required',
    );
  });
  it('W15: malformed contracts fail at the boundary without issuing a judgment', () => {
    for (const patch of [
      { senseId: 'house' },
      { accepted_answers: [] },
      { accepted_answers: accepted(' ') },
      { permittedEdgePunctuation: ['e'] },
      { articleRequired: true, acceptedArticles: [] },
      { alternatives: [{ surface: 'woning' }] },
      { hiddenFuzzyMode: true },
    ])
      expect(() => evaluateAnswer({ ...contract, ...patch }, 'huis')).toThrow();
    expect(() => evaluateAnswer(contract, '\ud800')).toThrow('well-formed');
    const original = JSON.stringify(contract);
    evaluateAnswer(contract, 'huis');
    expect(JSON.stringify(contract)).toBe(original);
  });
});
