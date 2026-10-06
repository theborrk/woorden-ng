import {
  array,
  boolean,
  check,
  enumeration,
  id,
  object,
  optional,
  text,
} from '../../contracts/runtime/schema.ts';
import type { Infer } from '../../contracts/runtime/schema.ts';

export const answerContract = object({
  senseId: id,
  exampleId: id,
  targetFormIds: array(id),
  family: enumeration('productive', 'verb_form', 'cloze', 'spelling', 'receptive'),
  accepted_answers: array(object({ ordered_segments: array(text), case_sensitive: boolean })),
  permittedEdgePunctuation: array(text),
  acceptedArticles: array(enumeration('de', 'het', 'een')),
  articleRequired: boolean,
  strictSpelling: boolean,
  selfGraded: optional(boolean),
  ambiguousCue: boolean,
  alternatives: array(
    object({ surface: text, senseId: id, validInContext: boolean, evidenceRef: text }),
  ),
  knownWords: array(text),
  reviewedEquivalents: array(object({ surface: text, evidenceRef: text })),
});
export type AnswerContract = Infer<typeof answerContract>;
type Component = 'correct' | 'incorrect' | 'not_tested';
export interface Judgment {
  targetSenseId: string;
  judgment: 'correct' | 'incorrect' | 'ungradable' | 'self_assessment_required';
  components: { lexical: Component; meaning: Component; article: Component; spelling: Component };
  reasons: string[];
  suggestedAnswers: string[];
}
/** NFC preserves accents; only explicitly permitted punctuation at the edges is removed. */
export function normalizeAnswer(
  value: string,
  punctuation: readonly string[],
  caseSensitive = true,
): string {
  let normalized = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
  while (normalized && punctuation.includes(Array.from(normalized)[0]!))
    normalized = Array.from(normalized).slice(1).join('').trimStart();
  while (normalized && punctuation.includes(Array.from(normalized).at(-1)!))
    normalized = Array.from(normalized).slice(0, -1).join('').trimEnd();
  return caseSensitive ? normalized : normalized.toLocaleLowerCase('nl');
}
/** One-edit suggestions never grant correctness, including when the response is a real word. */
function oneEdit(left: string, right: string): boolean {
  const a = Array.from(left),
    b = Array.from(right);
  if (Math.abs(a.length - b.length) > 1 || left === right) return false;
  let i = 0,
    j = 0,
    edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + (a.length - i) + (b.length - j) === 1;
}
export function evaluateAnswer(value: unknown, response: string): Judgment {
  const contract = answerContract(value, '$/contract');
  check(
    '$/response',
    typeof response === 'string' && response.isWellFormed(),
    'expected well-formed response text',
  );
  check(
    '$/contract/accepted_answers',
    contract.accepted_answers.length > 0 &&
      contract.accepted_answers.every(
        (a) =>
          a.ordered_segments.length > 0 &&
          a.ordered_segments.every((segment) => segment.trim().length > 0),
      ),
    'explicit accepted segments required',
  );
  check(
    '$/contract/permittedEdgePunctuation',
    contract.permittedEdgePunctuation.every((p) => /^\p{P}$/u.test(p)),
    'only single punctuation characters permitted',
  );
  check(
    '$/contract/acceptedArticles',
    !contract.articleRequired || contract.acceptedArticles.length > 0,
    'required article needs an explicit accepted set',
  );
  const base = normalizeAnswer(response, contract.permittedEdgePunctuation);
  const result: Judgment = {
    targetSenseId: contract.senseId,
    judgment: 'incorrect',
    components: {
      lexical: 'not_tested',
      meaning: 'not_tested',
      article: 'not_tested',
      spelling: 'not_tested',
    },
    reasons: [],
    suggestedAnswers: [],
  };
  if (contract.selfGraded) {
    result.judgment = 'self_assessment_required';
    result.reasons.push('self_graded_contract');
    return result;
  }
  if (contract.family === 'receptive') {
    const matched = contract.reviewedEquivalents.some(
      (e) =>
        normalizeAnswer(e.surface, contract.permittedEdgePunctuation, false) ===
        normalizeAnswer(base, [], false),
    );
    result.judgment = matched ? 'correct' : 'self_assessment_required';
    result.components.meaning = matched ? 'correct' : 'not_tested';
    if (!matched) result.reasons.push('reviewed_equivalent_unavailable_for_response');
    return result;
  }
  const articleMatch = /^(de|het|een)(?: |$)/iu.exec(base);
  // An article is separated only when this contract actually evaluates articles.
  const evaluatesArticle = contract.acceptedArticles.length > 0;
  const lexical = evaluatesArticle && articleMatch ? base.slice(articleMatch[0].length) : base;
  if (evaluatesArticle && (articleMatch || contract.articleRequired)) {
    result.components.article =
      articleMatch &&
      contract.acceptedArticles.includes(articleMatch[1]!.toLowerCase() as 'de' | 'het' | 'een')
        ? 'correct'
        : 'incorrect';
    if (result.components.article === 'incorrect') result.reasons.push('article_mismatch');
  }
  const match = contract.accepted_answers.find(
    (a) =>
      normalizeAnswer(
        a.ordered_segments.join(' '),
        contract.permittedEdgePunctuation,
        a.case_sensitive,
      ) === normalizeAnswer(lexical, [], a.case_sensitive),
  );
  if (match) {
    result.components.lexical = 'correct';
    result.components.meaning = 'correct';
    result.components.spelling =
      normalizeAnswer(match.ordered_segments.join(' '), contract.permittedEdgePunctuation) ===
      lexical
        ? 'correct'
        : 'incorrect';
    const strict = contract.strictSpelling || contract.family === 'spelling';
    result.judgment =
      strict && result.components.spelling === 'incorrect' ? 'incorrect' : 'correct';
    if (result.components.spelling === 'incorrect') result.reasons.push('spelling_mismatch');
    return result;
  }
  const alternative = contract.alternatives.find(
    (a) =>
      normalizeAnswer(a.surface, contract.permittedEdgePunctuation, false) ===
      normalizeAnswer(lexical, [], false),
  );
  if (alternative && contract.ambiguousCue && alternative.validInContext) {
    result.judgment = 'ungradable';
    result.reasons.push('valid_alternative_requires_prompt_repair');
    return result;
  }
  result.components.lexical = 'incorrect';
  result.components.meaning = 'incorrect';
  result.components.spelling = 'incorrect';
  if (alternative) result.reasons.push('alternative_wrong_for_precise_context');
  const known = contract.knownWords.some(
    (w) => normalizeAnswer(w, [], false) === normalizeAnswer(lexical, [], false),
  );
  if (alternative || known) result.components.spelling = 'not_tested';
  if (known) result.reasons.push('known_word_not_target');
  result.suggestedAnswers = contract.accepted_answers
    .map((a) => a.ordered_segments.join(' '))
    .filter((a) =>
      oneEdit(
        normalizeAnswer(a, contract.permittedEdgePunctuation, false),
        normalizeAnswer(lexical, [], false),
      ),
    );
  if (result.suggestedAnswers.length) result.reasons.push('possible_typo_suggestion_only');
  if (!result.reasons.length) result.reasons.push(base ? 'target_mismatch' : 'omitted');
  return result;
}
