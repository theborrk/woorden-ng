import {
  array,
  boolean,
  bounded,
  check,
  enumeration,
  id,
  instant,
  nullable,
  object,
  optional,
  studyDate as dateSchema,
} from '../../contracts/runtime/schema.ts';
import type { Infer } from '../../contracts/runtime/schema.ts';
import { projectEligibility } from '../time-policy/eligibility.ts';

export const policyVersion = 'evidence-v1-six-hour-later-days';
const cue = enumeration(
  'written_nl',
  'translation',
  'picture',
  'audio_word',
  'audio_sentence',
  'situation',
  'cloze',
);
const locale = nullable(enumeration('en', 'pl', 'ru'));
const exposureSchema = object({
  id,
  shownAt: instant,
  studyDate: dateSchema,
  targetSenseIds: array(id),
  taskId: nullable(id),
  attemptId: nullable(id),
  reason: enumeration(
    'teaching',
    'word_detail',
    'recap',
    'hint',
    'reveal',
    'feedback',
    'unexpected',
    'primary_cue_replay',
  ),
  resourceId: nullable(id),
  phase: enumeration('before_response', 'after_response', 'outside_attempt'),
});
const attemptSchema = object({
  id,
  sessionId: id,
  taskId: id,
  cueFamily: cue,
  cueLocale: locale,
  promptAt: instant,
  responseLockedAt: instant,
  studyDate: dateSchema,
  initial: enumeration('correct', 'incorrect', 'omitted', 'ungradable'),
  assisted: boolean,
  valid: boolean,
  eligible: boolean,
  mode: enumeration('scheduled', 'learning_practice', 'extra_practice', 'probe'),
  judgmentSource: enumeration('typed_rule', 'self_report', 'human_override'),
});
const inputSchema = object({
  version: enumeration(1),
  asOf: instant,
  task: object({
    id,
    senseId: id,
    cueFamily: cue,
    cueLocale: locale,
    primaryCueReplayAllowed: boolean,
  }),
  currentAttempt: nullable(object({ id, promptAt: instant })),
  introducedAt: nullable(instant),
  introducedStudyDate: nullable(dateSchema),
  exposureHistory: enumeration('complete', 'missing'),
  exposures: array(exposureSchema),
  attempts: array(attemptSchema),
  policy: optional(
    object({
      acquisitionGapMinutes: bounded(0, 1440),
      reviewGapMinutes: bounded(0, 1440),
      delayedGapHours: bounded(0, 8760),
      needsSupportFailures: bounded(1, 100),
    }),
  ),
});
export type EvidenceInput = Infer<typeof inputSchema>;
export type Exposure = Infer<typeof exposureSchema>;

/** Declared diagnostic history only: no clocks, scheduler calls or persistence. */
export function inspectEvidence(value: unknown, eligibilityInput: unknown) {
  const input = inputSchema(value, '$');
  const base = projectEligibility(eligibilityInput);
  check(
    '$/asOf',
    Date.parse(base.reviewedAt) <= input.asOf,
    'scheduler evaluation cannot follow inspection',
  );
  const policy = input.policy ?? {
    acquisitionGapMinutes: 1,
    reviewGapMinutes: 10,
    delayedGapHours: 6,
    needsSupportFailures: 3,
  };
  check(
    '$/introducedAt',
    (input.introducedAt === null) === (input.introducedStudyDate === null),
    'introduction instant and day must both be known or missing',
  );
  check(
    '$/introducedAt',
    input.introducedAt === null || input.introducedAt <= input.asOf,
    'introduction cannot be in the future',
  );
  const unique = (values: { id: string }[], path: string) =>
    check(path, new Set(values.map((v) => v.id)).size === values.length, 'duplicate history IDs');
  unique(input.exposures, '$/exposures');
  unique(input.attempts, '$/attempts');
  for (const attempt of input.attempts) {
    check(
      '$/attempts',
      attempt.promptAt <= attempt.responseLockedAt && attempt.responseLockedAt <= input.asOf,
      'response must follow prompt and precede inspection',
    );
  }
  if (input.currentAttempt)
    check(
      '$/currentAttempt',
      input.currentAttempt.promptAt <= input.asOf,
      'prompt cannot be in the future',
    );
  for (const exposure of input.exposures) {
    check('$/exposures', exposure.shownAt <= input.asOf, 'exposure cannot be in the future');
    const attempt = input.attempts.find((a) => a.id === exposure.attemptId);
    if (exposure.reason === 'feedback')
      check(
        '$/exposures',
        exposure.phase === 'after_response' &&
          (!attempt || exposure.shownAt > attempt.responseLockedAt),
        'feedback must follow the locked response',
      );
  }
  const sameFamily = (attempt: Infer<typeof attemptSchema>) =>
    attempt.taskId === input.task.id &&
    attempt.cueFamily === input.task.cueFamily &&
    attempt.cueLocale === input.task.cueLocale;
  const isPrimary = (exposure: Exposure) => {
    if (
      exposure.reason !== 'primary_cue_replay' ||
      !input.task.primaryCueReplayAllowed ||
      !['audio_word', 'audio_sentence'].includes(input.task.cueFamily) ||
      exposure.taskId !== input.task.id
    )
      return false;
    const historical = input.attempts.find((a) => sameFamily(a) && a.id === exposure.attemptId);
    const current = input.currentAttempt?.id === exposure.attemptId ? input.currentAttempt : null;
    const prompt = historical?.promptAt ?? current?.promptAt;
    return (
      prompt !== undefined &&
      exposure.shownAt >= prompt &&
      (historical ? exposure.shownAt <= historical.responseLockedAt : true) &&
      exposure.phase === 'before_response'
    );
  };
  const relevant = input.exposures.filter((e) => e.targetSenseIds.includes(input.task.senseId));
  const ignoredPrimaryReplays = relevant.filter(isPrimary);
  const exposures = relevant
    .filter((e) => !isPrimary(e))
    .sort((a, b) => a.shownAt - b.shownAt || a.id.localeCompare(b.id));
  const historyKnown = input.exposureHistory === 'complete' && input.introducedAt !== null;
  const gapAt = (at: number) => {
    const preceding = exposures.filter((e) => e.shownAt <= at);
    const last = preceding.at(-1) ?? null;
    const latestAt = Math.max(input.introducedAt ?? -Infinity, last?.shownAt ?? -Infinity);
    return {
      lastExposure: last,
      cleanGapMs:
        historyKnown && Number.isFinite(latestAt) && latestAt <= at ? at - latestAt : null,
      observedGapMs: Number.isFinite(latestAt) && latestAt <= at ? at - latestAt : null,
      latestStudyDate:
        last && last.shownAt >= (input.introducedAt ?? -Infinity)
          ? last.studyDate
          : input.introducedStudyDate,
    };
  };
  const attempts = input.attempts
    .filter(sameFamily)
    .sort((a, b) => a.responseLockedAt - b.responseLockedAt || a.id.localeCompare(b.id));
  const qualifyingDays = new Set<string>();
  let failures: Infer<typeof attemptSchema>[] = [];
  const diagnostics = attempts.map((attempt) => {
    const gap = gapAt(attempt.responseLockedAt);
    const help = exposures.filter(
      (e) =>
        e.attemptId === attempt.id &&
        e.shownAt >= attempt.promptAt &&
        e.shownAt <= attempt.responseLockedAt,
    );
    const independent = attempt.initial === 'correct' && !attempt.assisted && help.length === 0;
    const routine = attempt.valid && attempt.eligible && attempt.mode === 'scheduled';
    const reasons: string[] = [];
    if (!historyKnown) reasons.push('missing_exposure_history_or_introduction');
    if (gap.cleanGapMs === null) reasons.push('unknown_clean_gap');
    if (!routine) reasons.push('not_valid_eligible_scheduled_attempt');
    if (!independent) reasons.push('no_independent_initial_success');
    if (gap.cleanGapMs !== null && gap.cleanGapMs < policy.delayedGapHours * 3_600_000)
      reasons.push('short_clean_gap');
    if (
      attempt.studyDate <= (input.introducedStudyDate ?? attempt.studyDate) ||
      attempt.studyDate <= (gap.latestStudyDate ?? attempt.studyDate)
    )
      reasons.push('not_later_study_day');
    if (reasons.length === 0) qualifyingDays.add(attempt.studyDate);
    if (routine) {
      if (independent) failures = [];
      else if (
        attempt.initial === 'incorrect' ||
        attempt.initial === 'omitted' ||
        attempt.assisted ||
        help.length
      )
        failures.push(attempt);
    }
    return {
      ...attempt,
      ...gap,
      independent,
      qualifiesDelayedRecall: reasons.length === 0,
      reasons,
      assistanceBeforeResponse: help,
    };
  });
  const needsSupport =
    failures.length >= policy.needsSupportFailures &&
    new Set(failures.map((a) => a.sessionId)).size >= 2;
  const evidenceStatus = needsSupport
    ? 'needs_support'
    : qualifyingDays.size >= 2
      ? 'maintaining'
      : qualifyingDays.size === 1
        ? 'later_recall_observed'
        : 'acquiring';
  const latest = gapAt(input.asOf);
  const gapMinutes =
    base.gates.some((g) => g.reason === 'study_day') ||
    (eligibilityInput !== null &&
      typeof eligibilityInput === 'object' &&
      'phase' in eligibilityInput &&
      eligibilityInput.phase === 'review')
      ? policy.reviewGapMinutes
      : policy.acquisitionGapMinutes;
  const knownExposureAt = Math.max(
    input.introducedAt ?? -Infinity,
    exposures.at(-1)?.shownAt ?? -Infinity,
  );
  const exposureEligibleAt = Number.isFinite(knownExposureAt)
    ? new Date(knownExposureAt + gapMinutes * 60_000).toISOString()
    : null;
  // Reuse T-143's max-of-gates projection; never rewrite its raw engine due.
  const eligibility =
    exposureEligibleAt === null
      ? base
      : projectEligibility({
          ...(eligibilityInput as Record<string, unknown>),
          exposureEligibleAt: base.gates
            .filter((g) => g.reason === 'exposure')
            .reduce((at, g) => (Date.parse(g.at) > Date.parse(at) ? g.at : at), exposureEligibleAt),
        });
  return {
    policyVersion,
    policy,
    task: input.task,
    asOf: input.asOf,
    historyComplete: historyKnown,
    uncertainty: historyKnown ? [] : ['missing_exposure_history_or_introduction'],
    evidenceStatus,
    qualifyingStudyDates: [...qualifyingDays].sort(),
    attempts: diagnostics,
    ...latest,
    relevantExposures: exposures,
    ignoredPrimaryReplays,
    exposureEligibleAt,
    eligibility,
  };
}
