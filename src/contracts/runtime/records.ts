import {
  array,
  boolean,
  bounded,
  check,
  count,
  enumeration,
  hash,
  id,
  instant,
  isoInstant,
  locale,
  nullable,
  object,
  optional,
  positive,
  studyDate,
  text,
  zone,
  FieldError,
} from './schema.ts';
import type { Infer, Schema } from './schema.ts';

const version = enumeration(1);
const mode = enumeration('scheduled', 'learning_practice', 'extra_practice', 'probe');
const inputMode = enumeration('typed', 'spoken_self_report', 'thought_self_report', 'recorded');
const rating = enumeration('again', 'hard', 'good', 'easy');
const assistance = object({
  kind: enumeration(
    'meaning_support',
    'mnemonic',
    'image',
    'sound_onset',
    'letters',
    'choices',
    'full_answer',
    'unexpected_exposure',
  ),
  shownAt: instant,
  phase: enumeration('before_response'),
  resourceId: optional(id),
});
const component = optional(enumeration('correct', 'incorrect', 'not_tested'));
const result = object({
  initial: enumeration('correct', 'incorrect', 'omitted', 'ungradable'),
  final: enumeration('correct', 'incorrect', 'revealed', 'ungradable'),
  assistance: array(assistance),
  effort: optional(enumeration('ordinary', 'effortful')),
  components: object({
    meaning: component,
    form: component,
    article: component,
    spelling: component,
  }),
  judgmentSource: enumeration('typed_rule', 'self_report', 'human_override'),
  acceptedAlternativeSenseId: optional(id),
  confusedWithSenseId: optional(id),
});
const nativeCard = object({
  due: isoInstant,
  stability: bounded(0, Number.MAX_VALUE, false),
  difficulty: bounded(0, 10, false),
  elapsed_days: count,
  scheduled_days: count,
  reps: count,
  lapses: count,
  learning_steps: count,
  state: enumeration(0, 1, 2, 3),
  last_review: optional(isoInstant),
});
const schedulerShape = object({
  engine: enumeration('ts-fsrs'),
  packageVersion: enumeration('5.4.2'),
  parameterSetId: id,
  serializationVersion: version,
  nativeCard,
  rawDueAt: instant,
  phase: enumeration('new', 'learning', 'review', 'relearning'),
  scheduledDays: count,
});
export const scheduler: Schema<Infer<typeof schedulerShape>> = (v, p) => {
  const s = schedulerShape(v, p);
  check(
    `${p}/phase`,
    ['new', 'learning', 'review', 'relearning'][s.nativeCard.state] === s.phase,
    'must match native state',
  );
  check(`${p}/rawDueAt`, Date.parse(s.nativeCard.due) === s.rawDueAt, 'must match native due');
  check(
    `${p}/scheduledDays`,
    s.scheduledDays === s.nativeCard.scheduled_days,
    'must match native scheduled days',
  );
  check(
    `${p}/nativeCard/last_review`,
    s.nativeCard.state === 0 || s.nativeCard.last_review !== undefined,
    'required for a reviewed card',
  );
  check(
    `${p}/nativeCard/lapses`,
    s.nativeCard.lapses <= s.nativeCard.reps,
    'cannot exceed repetitions',
  );
  return s;
};
export const eligibility = object({
  eligibleAt: instant,
  dueStudyDate: optional(studyDate),
  projectedInTimeZone: zone,
  reasons: array(
    enumeration('engine_due', 'study_day', 'minimum_gap', 'sibling_exposure', 'postponed'),
  ),
  policyVersion: text,
});
// A self-contained display snapshot avoids relying on a deleted content pack revision.
export const promptContext = object({
  contextVersion: version,
  promptId: id,
  answerIds: array(id),
  cueLocale: locale,
  promptText: text,
  answerTexts: array(text),
  contentVersion: text,
  gradingContractId: id,
  gradingContractVersion: positive,
});
const context: Schema<Infer<typeof promptContext>> = (v, p) => {
  const c = promptContext(v, p);
  check(
    `${p}/answerIds`,
    c.answerIds.length > 0 && c.answerIds.length === c.answerTexts.length,
    'answer IDs and snapshots must correspond',
  );
  return c;
};
const preferences = {
  interfaceLocale: enumeration('en', 'pl'),
  cueLocale: locale,
  timeZone: zone,
  studyDayBoundaryMinutes: bounded(0, 1439),
  dailyNewConceptBudget: count,
  dailyReviewBudget: count,
  goal: text,
  capabilities: object({ audio: boolean, microphone: boolean }),
  consent: object({ diagnostics: boolean, experiments: boolean }),
};
const budget = object({ maxAttempts: count, maxNewConcepts: count, maxDurationMs: count });
const common = { formatVersion: version };
const eventBase = {
  ...common,
  eventVersion: version,
  id,
  profileId: id,
  deviceId: id,
  deviceSequence: positive,
  occurredAt: instant,
  timeZone: zone,
  studyDate,
};
const attemptBase = {
  sessionId: id,
  attemptId: id,
  taskId: id,
  promptVariantId: id,
  contentVersion: text,
  gradingContractVersion: positive,
  promptContext: context,
};
const scheduling = object({
  rating,
  before: nullable(scheduler),
  after: scheduler,
  eligibilityAfter: eligibility,
  adapterVersion: text,
});
const committed = object({
  ...eventBase,
  ...attemptBase,
  kind: enumeration('attempt_committed'),
  commitKey: text,
  responseCommittedAt: optional(instant),
  inputMode,
  foregroundResponseMs: optional(count),
  mode,
  result,
  cleanGapMs: nullable(count),
  exposureContaminated: boolean,
  expectedTaskRevision: count,
  parentTransitionId: nullable(id),
  expectedStateHash: hash,
  probeAssignmentId: optional(id),
  scheduling: nullable(scheduling),
});
const step: Schema<string> = (v, p) => {
  const s = text(v, p);
  check(p, /^[1-9]\d*(\.\d+)?[mhd]$/.test(s), 'expected positive FSRS duration');
  return s;
};
const parameterShape = object({
  ...common,
  kind: enumeration('parameter_set'),
  id,
  parameterVersion: version,
  engine: enumeration('ts-fsrs'),
  packageVersion: enumeration('5.4.2'),
  createdAt: instant,
  parameters: object({
    request_retention: bounded(Number.EPSILON, 1 - Number.EPSILON, false),
    maximum_interval: positive,
    w: array(bounded(-Number.MAX_VALUE, Number.MAX_VALUE, false)),
    enable_fuzz: boolean,
    enable_short_term: boolean,
    learning_steps: array(step),
    relearning_steps: array(step),
  }),
});
const definitions = {
  profile: object({
    ...common,
    kind: enumeration('profile'),
    id,
    profileVersion: version,
    createdAt: instant,
    name: text,
  }),
  preferences: object({
    ...common,
    kind: enumeration('preferences'),
    preferencesVersion: version,
    profileId: id,
    revision: count,
    updatedAt: instant,
    ...preferences,
  }),
  task_definition: object({
    ...common,
    kind: enumeration('task_definition'),
    taskVersion: version,
    id,
    senseId: id,
    lexemeId: id,
    skill: enumeration(
      'receptive',
      'productive',
      'listening',
      'article',
      'spelling',
      'verb_form',
      'context_use',
    ),
    cueFamily: enumeration(
      'written_nl',
      'translation',
      'picture',
      'audio_word',
      'audio_sentence',
      'situation',
      'cloze',
    ),
    cueLocale: optional(locale),
    targetFormId: optional(id),
    gradingContractId: id,
    gradingContractVersion: positive,
    contentVersion: text,
    promptVariantIds: array(id),
  }),
  enrollment: object({
    ...common,
    kind: enumeration('enrollment'),
    enrollmentVersion: version,
    profileId: id,
    senseId: id,
    status: enumeration('selected', 'introduced', 'postponed', 'suspended', 'known_before_study'),
    revision: count,
    updatedAt: instant,
    introducedStudyDate: optional(studyDate),
    postponedUntil: optional(instant),
  }),
  task_progress: object({
    ...common,
    kind: enumeration('task_progress'),
    progressVersion: version,
    profileId: id,
    taskId: id,
    activation: enumeration('dormant', 'active', 'suspended'),
    revision: count,
    updatedAt: instant,
    scheduler: nullable(scheduler),
    eligibility,
    evidenceStatus: enumeration(
      'unseen',
      'acquiring',
      'later_recall_observed',
      'maintaining',
      'needs_support',
    ),
    lastAttemptId: optional(id),
    lastAnswerExposureAt: optional(instant),
  }),
  session: object({
    ...common,
    kind: enumeration('session'),
    sessionVersion: version,
    id,
    profileId: id,
    intent: mode,
    budget,
    seed: text,
    completedAttemptIds: array(id),
    currentDraftId: nullable(id),
    status: enumeration('active', 'interrupted', 'completed'),
    createdAt: instant,
    updatedAt: instant,
  }),
  attempt_draft: object({
    ...common,
    kind: enumeration('attempt_draft'),
    draftVersion: version,
    id,
    profileId: id,
    ...attemptBase,
    status: enumeration('open', 'response_locked', 'interrupted'),
    createdAt: instant,
    updatedAt: instant,
    inputMode,
    mode,
    expectedTaskRevision: count,
    parentTransitionId: nullable(id),
    expectedStateHash: hash,
    assistance: array(assistance),
    responseCommittedAt: optional(instant),
  }),
  scheduler_envelope: object({ ...common, kind: enumeration('scheduler_envelope'), scheduler }),
  parameter_set: parameterShape,
  attempt_committed: committed,
  assistance: object({ ...eventBase, ...attemptBase, kind: enumeration('assistance'), assistance }),
  exposure: object({
    ...eventBase,
    kind: enumeration('exposure'),
    sessionId: id,
    attemptId: optional(id),
    taskId: id,
    promptContext: context,
    source: enumeration('teaching', 'feedback', 'reveal', 'audio', 'unexpected'),
    targetSenseIds: array(id),
  }),
  introduction: object({
    ...eventBase,
    kind: enumeration('introduction'),
    sessionId: id,
    senseId: id,
    promptContext: context,
  }),
  correction: object({
    ...eventBase,
    kind: enumeration('correction'),
    targetEventId: id,
    reason: text,
    result,
  }),
  undo: object({ ...eventBase, kind: enumeration('undo'), targetEventId: id, reason: text }),
  administrative_change: object({
    ...eventBase,
    kind: enumeration('administrative_change'),
    targetId: id,
    action: enumeration('activate', 'suspend', 'postpone', 'change_preferences'),
    reason: text,
    revision: count,
  }),
};
export type RuntimeRecord = {
  [K in keyof typeof definitions]: Infer<(typeof definitions)[K]>;
}[keyof typeof definitions];

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

export function validateRecord(value: unknown): RuntimeRecord {
  check(
    '$',
    typeof value === 'object' && value !== null && !Array.isArray(value),
    'expected record',
  );
  check(
    '$/kind',
    'kind' in value && typeof value.kind === 'string' && Object.hasOwn(definitions, value.kind),
    'unsupported record kind',
  );
  const kind = value.kind;
  // Dispatch only after checking an own key of the closed schema registry.
  const record = definitions[kind as keyof typeof definitions](value, '$');
  if (record.kind === 'task_definition') {
    check(
      '$/cueLocale',
      record.cueFamily !== 'translation' || record.cueLocale !== undefined,
      'translation requires cue locale',
    );
    check(
      '$/promptVariantIds',
      record.promptVariantIds.length > 0,
      'requires compatible prompt variants',
    );
  }
  if (record.kind === 'parameter_set')
    check('$/parameters/w', record.parameters.w.length === 21, 'FSRS-6.0 requires 21 weights');
  if ('createdAt' in record && 'updatedAt' in record)
    check('$/updatedAt', record.updatedAt >= record.createdAt, 'must not precede creation');
  if ('promptContext' in record && 'contentVersion' in record) {
    check(
      '$/promptContext/contentVersion',
      record.promptContext.contentVersion === record.contentVersion,
      'must match event version',
    );
    check(
      '$/promptContext/gradingContractVersion',
      record.promptContext.gradingContractVersion === record.gradingContractVersion,
      'must match grading version',
    );
  }
  if (record.kind === 'attempt_committed') {
    check(
      '$/commitKey',
      record.commitKey === `${record.profileId}:${record.attemptId}`,
      'expected profileId:attemptId',
    );
    check(
      '$/responseCommittedAt',
      record.responseCommittedAt === undefined || record.responseCommittedAt <= record.occurredAt,
      'cannot follow commit',
    );
  }
  if (record.kind === 'attempt_draft')
    check(
      '$/responseCommittedAt',
      record.status !== 'response_locked' || record.responseCommittedAt !== undefined,
      'locked response requires timestamp',
    );
  return freeze(record);
}

/** Allocate only new runtime identities; inspection never allocates or rewrites content IDs. */
export function allocateIdentity(allocateId: () => unknown, now: () => unknown) {
  return Object.freeze({ id: id(allocateId(), '$/id'), createdAt: instant(now(), '$/createdAt') });
}
export { FieldError };
