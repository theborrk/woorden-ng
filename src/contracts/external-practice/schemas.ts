/** Pure, closed V1 boundary schemas. Unknown fields are errors, never stripped. */
type Parser<T> = (input: unknown, path: string) => T;
type Parsed<P> = P extends Parser<infer T> ? T : never;

function invalid(path: string, reason: string): never {
  throw new Error(`${path}: ${reason}`);
}

const text: Parser<string> = (input, path) =>
  typeof input === 'string' && input.trim().length > 0
    ? input
    : invalid(path, 'expected non-empty string');

const instant: Parser<number> = (input, path) =>
  typeof input === 'number' && Number.isSafeInteger(input) && input >= 0 && input <= 8.64e15
    ? input
    : invalid(path, 'expected epoch milliseconds');

const positiveVersion: Parser<number> = (input, path) =>
  typeof input === 'number' && Number.isSafeInteger(input) && input > 0
    ? input
    : invalid(path, 'expected positive integer version');

function choice<const T extends readonly (string | number | boolean)[]>(
  ...values: T
): Parser<T[number]> {
  return (input, path) => {
    const match = values.find((value) => value === input);
    return match === undefined ? invalid(path, `expected ${values.join(' | ')}`) : match;
  };
}

function list<T>(parse: Parser<T>, nonEmpty = false): Parser<T[]> {
  return (input, path) => {
    if (!Array.isArray(input) || (nonEmpty && input.length === 0)) {
      return invalid(path, nonEmpty ? 'expected non-empty array' : 'expected array');
    }
    return input.map((value: unknown, index) => parse(value, `${path}[${index}]`));
  };
}

function object<S extends Record<string, Parser<unknown>>>(
  shape: S,
): Parser<{ [K in keyof S]: Parsed<S[K]> }> {
  return (input, path) => {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      return invalid(path, 'expected object');
    }
    const record = input as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (!Object.hasOwn(shape, key)) invalid(`${path}.${key}`, 'unknown field');
    }
    const result: Record<string, unknown> = {};
    for (const [key, parse] of Object.entries(shape)) {
      result[key] = parse(record[key], `${path}.${key}`);
    }
    // Each required key above is validated by its corresponding parser.
    return result as { [K in keyof S]: Parsed<S[K]> };
  };
}

function schema<T>(parse: Parser<T>) {
  return { parse: (input: unknown): T => parse(input, '$') };
}

const locale = choice('en', 'pl');
const bilingual = object({ en: text, pl: text });
const assistanceKind = choice(
  'meaning_support',
  'mnemonic',
  'image',
  'sound_onset',
  'letters',
  'choices',
  'full_answer',
  'unexpected_exposure',
);
const preferences = object({
  interfaceLocale: locale,
  explanationLocale: locale,
  cueLocale: locale,
});
const target = { senseId: text, taskId: text };
const support = object({
  id: text,
  kind: assistanceKind,
  explanation: bilingual,
  origin: choice('authored', 'source', 'personal', 'generated'),
  reviewStatus: choice('unreviewed', 'source_verified', 'ai_reviewed'),
  selected: choice(true, false),
});
const hint = object({ id: text, kind: assistanceKind, explanation: bilingual });

export const TutorSessionPackageV1Schema = schema(
  object({
    kind: choice('tutor_session_package'),
    schemaVersion: choice(1),
    sessionId: text,
    profileId: text,
    createdAt: instant,
    contentRevision: text,
    preferences,
    lessons: list(
      object({
        ...target,
        explanation: bilingual,
        supports: list(support),
        cuePolicy: object({
          family: choice(
            'written_nl',
            'translation',
            'picture',
            'audio_word',
            'audio_sentence',
            'situation',
            'cloze',
          ),
          locale,
          primaryCue: bilingual,
          primaryCueReplayAllowed: choice(true, false),
        }),
        helpPolicy: object({ version: positiveVersion, graduatedHints: list(hint) }),
      }),
      true,
    ),
  }),
);
export type TutorSessionPackageV1 = ReturnType<typeof TutorSessionPackageV1Schema.parse>;

const helpUsed: Parser<
  | { status: 'unknown' }
  | { status: 'known'; assistance: { kind: Parsed<typeof assistanceKind>; shownAt: number }[] }
> = (input, path) => {
  if (
    typeof input === 'object' &&
    input !== null &&
    'status' in input &&
    input.status === 'unknown'
  ) {
    return object({ status: choice('unknown') })(input, path);
  }
  return object({
    status: choice('known'),
    assistance: list(object({ kind: assistanceKind, shownAt: instant })),
  })(input, path);
};
const payloadHash: Parser<string> = (input, path) => {
  const value = text(input, path);
  return /^sha256:[a-f0-9]{64}$/.test(value)
    ? value
    : invalid(path, 'expected sha256:<64 lowercase hexadecimal digits>');
};

export const ExternalPracticeObservationV1Schema = schema(
  object({
    kind: choice('external_practice_observation'),
    schemaVersion: choice(1),
    id: text,
    sessionId: text,
    profileId: text,
    ...target,
    contentRevision: text,
    occurredAt: instant,
    reportingSource: object({ id: text, kind: choice('learner_report', 'external_tutor_report') }),
    reportedOutcome: choice('correct', 'incorrect', 'omitted', 'ungradable'),
    helpUsed,
    payloadVersion: positiveVersion,
    payloadHash,
  }),
);
export type ExternalPracticeObservationV1 = ReturnType<
  typeof ExternalPracticeObservationV1Schema.parse
>;
