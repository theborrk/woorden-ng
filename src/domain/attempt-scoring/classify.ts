import {
  array,
  boolean,
  check,
  count,
  enumeration,
  FieldError,
  instant,
  nullable,
  object,
  optional,
} from '../../contracts/runtime/schema.ts';
import type { Infer } from '../../contracts/runtime/schema.ts';

const component = enumeration('correct', 'incorrect', 'not_tested');
const trialSchema = object({
  mode: enumeration('scheduled', 'learning_practice', 'extra_practice', 'probe'),
  eligible: boolean,
  promptValid: boolean,
  inputSupported: boolean,
  primaryCue: enumeration('text', 'referent_image', 'audio'),
  primaryAudioReplayAllowed: boolean,
  media: enumeration('available', 'unavailable', 'not_required'),
  inputMode: enumeration(
    'typed',
    'spoken_self_report',
    'thought_self_report',
    'recorded',
    'recognition',
  ),
  judgmentSource: enumeration('typed_rule', 'self_report', 'human_override', 'automatic_speech'),
  targetComponent: enumeration('meaning', 'form', 'article', 'spelling'),
  components: object({
    meaning: component,
    form: component,
    article: component,
    spelling: component,
  }),
  initial: enumeration('correct', 'incorrect', 'omitted', 'ungradable', 'valid_alternative'),
  final: enumeration('correct', 'incorrect', 'revealed', 'ungradable'),
  promptAt: instant,
  responseLockedAt: nullable(instant),
  supports: array(
    object({
      kind: enumeration(
        'primary_audio_replay',
        'mnemonic_image',
        'sound_onset',
        'letters',
        'meaning_support',
        'choices',
        'full_answer',
        'feedback',
        'unexpected_exposure',
      ),
      shownAt: instant,
    }),
  ),
  effort: enumeration('ordinary', 'effortful'),
  easyChosen: boolean,
  advancedMode: boolean,
  responseDurationMs: optional(count),
});

export type Trial = Infer<typeof trialSchema>;
export type Rating = 'again' | 'hard' | 'good' | 'easy';
export type Classification = {
  valid: boolean;
  issues: string[];
  proposedRatings: [] | [Rating];
  reasons: string[];
  declaredInitial: Trial['initial'] | null;
  initial: Trial['initial'] | null;
  final: Trial['final'] | null;
  independent: boolean;
  evidenceSource: Trial['judgmentSource'] | null;
  verifiedSpeech: false;
  components: Trial['components'] | null;
  assistanceBeforeResponse: Trial['supports'];
  exposuresAfterResponse: Trial['supports'];
};

function parseTrial(value: unknown): Trial {
  const trial = trialSchema(value, '$');
  const lock = trial.responseLockedAt;
  check('$/responseLockedAt', lock === null || lock >= trial.promptAt, 'cannot precede prompt');
  check(
    '$/responseLockedAt',
    trial.initial === 'omitted' || lock !== null,
    'a declared response must be locked',
  );
  trial.supports.forEach((support, i) => {
    check(`$/supports/${i}/shownAt`, support.shownAt >= trial.promptAt, 'cannot precede prompt');
    if (support.kind === 'feedback')
      check(
        `$/supports/${i}`,
        lock !== null && support.shownAt > lock,
        'feedback requires an earlier locked response',
      );
    if (support.kind === 'primary_audio_replay')
      check(
        `$/supports/${i}`,
        trial.primaryCue === 'audio' && trial.primaryAudioReplayAllowed,
        'replay is not a permitted primary cue',
      );
  });
  check(
    '$/judgmentSource',
    trial.judgmentSource !== 'typed_rule' || trial.inputMode === 'typed',
    'typed rules require typed input',
  );
  return trial;
}

/** Classifies one declared trial only; never calls a scheduler or creates events. */
export function classifyAttempt(value: unknown): Classification {
  let trial: Trial;
  try {
    trial = parseTrial(value);
  } catch (error) {
    if (!(error instanceof FieldError)) throw error;
    return {
      valid: false,
      issues: [error.message],
      proposedRatings: [],
      reasons: ['invalid_input'],
      declaredInitial: null,
      initial: null,
      final: null,
      independent: false,
      evidenceSource: null,
      verifiedSpeech: false,
      components: null,
      assistanceBeforeResponse: [],
      exposuresAfterResponse: [],
    };
  }
  const before = trial.supports.filter(
    (s) => trial.responseLockedAt === null || s.shownAt <= trial.responseLockedAt,
  );
  const assistance = before.filter((s) => s.kind !== 'primary_audio_replay');
  const after = trial.supports.filter(
    (s) => trial.responseLockedAt !== null && s.shownAt > trial.responseLockedAt,
  );
  // A response after seeing the answer cannot turn an omission into independent recall.
  const initial =
    trial.initial === 'incorrect'
      ? 'incorrect'
      : before.some((s) => s.kind === 'full_answer')
        ? 'omitted'
        : trial.initial === 'correct' && assistance.length > 0
          ? 'omitted'
          : trial.initial;
  const reasons: string[] = [];
  if (!trial.promptValid) reasons.push('invalid_prompt');
  if (before.some((s) => s.kind === 'unexpected_exposure'))
    reasons.push('unexpected_exposure_requires_practice');
  if (!trial.inputSupported || trial.judgmentSource === 'automatic_speech')
    reasons.push('unsupported_input');
  if (trial.inputMode === 'recognition') reasons.push('recognition_is_not_recall');
  if (trial.primaryCue !== 'text' && trial.media !== 'available')
    reasons.push('required_media_unavailable');
  if (trial.initial === 'ungradable' || trial.final === 'ungradable')
    reasons.push('ungradable_response');
  if (trial.initial === 'valid_alternative')
    reasons.push('valid_alternative_requires_prompt_repair');
  const target = trial.components[trial.targetComponent];
  if (
    (trial.initial === 'correct' && target !== 'correct') ||
    (trial.initial === 'incorrect' && target !== 'incorrect')
  )
    reasons.push('conflicting_target_component');
  const independent = reasons.length === 0 && initial === 'correct' && assistance.length === 0;
  if (trial.mode !== 'scheduled') reasons.push('observational_practice_or_probe');
  else if (!trial.eligible) reasons.push('early_practice');
  let proposedRatings: Classification['proposedRatings'] = [];
  if (reasons.length === 0) {
    if (initial === 'incorrect' || initial === 'omitted') {
      proposedRatings = ['again'];
      reasons.push(assistance.length > 0 ? 'initial_failure_with_assistance' : 'initial_failure');
    } else if (independent) {
      proposedRatings = [
        trial.effort === 'effortful'
          ? 'hard'
          : trial.easyChosen && trial.advancedMode
            ? 'easy'
            : 'good',
      ];
      reasons.push(
        trial.effort === 'effortful'
          ? 'declared_effortful_retrieval'
          : trial.easyChosen && trial.advancedMode
            ? 'advanced_independent_easy'
            : 'independent_correct',
      );
    }
  }
  return {
    valid: true,
    issues: [],
    proposedRatings,
    reasons,
    declaredInitial: trial.initial,
    initial,
    final: trial.final,
    independent,
    evidenceSource: trial.judgmentSource,
    verifiedSpeech: false,
    components: trial.components,
    assistanceBeforeResponse: assistance,
    exposuresAfterResponse: after,
  };
}
