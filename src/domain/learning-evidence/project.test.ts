import { expect, it } from 'vitest';
import { inspectEvidence } from './project.ts';
import type { EvidenceInput, Exposure } from './project.ts';
import fixture from '../../../tests/fixtures/learning/evidence/recap.json';

const at = (iso: string) => Date.parse(iso);
const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const baseline = (): EvidenceInput =>
  ({ ...structuredClone(fixture.evidence), policy: undefined }) as EvidenceInput;
const attempt = (day: string, n = 10): EvidenceInput['attempts'][number] => ({
  id: id(n),
  sessionId: id(n + 100),
  taskId: id(1),
  cueFamily: 'translation',
  cueLocale: 'pl',
  promptAt: at(`${day}T11:59:00Z`),
  responseLockedAt: at(`${day}T12:00:00Z`),
  studyDate: day,
  initial: 'correct',
  assisted: false,
  valid: true,
  eligible: true,
  mode: 'scheduled',
  judgmentSource: 'self_report',
});

it('I10: AC1 teaching/detail/recap exposure gates shift by one or ten minutes without scheduler mutation', () => {
  for (const reason of ['teaching', 'word_detail', 'recap'] as const)
    for (const phase of ['new', 'learning', 'relearning', 'review'] as const) {
      const input = baseline();
      input.exposures[0]!.reason = reason;
      const eligibility = { ...fixture.eligibility, phase };
      const before = JSON.stringify({ input, eligibility });
      const result = inspectEvidence(input, eligibility);
      expect(result.eligibility.eligibleAt).toBe(
        phase === 'review' ? '2026-10-02T12:09:00Z' : '2026-10-02T12:00:00Z',
      );
      expect(result.eligibility.rawDueAt).toBe(eligibility.rawDueAt);
      expect(result.relevantExposures[0]).toEqual(input.exposures[0]);
      expect(result.cleanGapMs).toBe(60_000);
      expect(JSON.stringify({ input, eligibility })).toBe(before);
    }
  const input = baseline();
  input.policy = {
    acquisitionGapMinutes: 2,
    reviewGapMinutes: 15,
    delayedGapHours: 6,
    needsSupportFailures: 3,
  };
  expect(inspectEvidence(input, fixture.eligibility).eligibility.eligibleAt).toBe(
    '2026-10-02T12:14:00Z',
  );
});
it('I05: AC2 permitted same-attempt primary replay adds no help gate; other families and unpermitted replays remain exposure', () => {
  const input = baseline();
  input.task.cueFamily = 'audio_word';
  input.task.cueLocale = null;
  input.task.primaryCueReplayAllowed = true;
  input.currentAttempt = { id: id(10), promptAt: at('2026-10-02T11:58:00Z') };
  Object.assign(input.exposures[0]!, {
    reason: 'primary_cue_replay',
    attemptId: id(10),
    phase: 'before_response',
  });
  const result = inspectEvidence(input, fixture.eligibility);
  expect(result.relevantExposures).toEqual([]);
  expect(result.ignoredPrimaryReplays).toEqual(input.exposures);
  expect(result.eligibility.eligibleAt).toBe('2026-10-02T11:10:00Z');
  input.attempts = [{ ...attempt('2026-10-02'), cueFamily: 'audio_word', cueLocale: null }];
  expect(inspectEvidence(input, fixture.eligibility).attempts[0]).toMatchObject({
    independent: true,
    qualifiesDelayedRecall: true,
    assistanceBeforeResponse: [],
  });
  input.attempts = [];
  for (const patch of [
    { ...input, task: { ...input.task, primaryCueReplayAllowed: false } },
    { ...input, task: { ...input.task, id: id(20), cueFamily: 'translation', cueLocale: 'pl' } },
    { ...input, currentAttempt: null },
  ])
    expect(inspectEvidence(patch, fixture.eligibility).eligibility.eligibleAt).toBe(
      '2026-10-02T12:09:00Z',
    );
});
it('I03: AC2 feedback after the lock preserves independent success and shifts only subsequent clean gaps', () => {
  const input = baseline();
  input.asOf = at('2026-10-02T12:20:00Z');
  input.attempts = [attempt('2026-10-02')];
  Object.assign(input.exposures[0]!, {
    reason: 'feedback',
    shownAt: at('2026-10-02T12:01:00Z'),
    attemptId: id(10),
    phase: 'after_response',
  });
  const result = inspectEvidence(input, fixture.eligibility);
  expect(result.attempts[0]).toMatchObject({
    independent: true,
    initial: 'correct',
    qualifiesDelayedRecall: true,
    cleanGapMs: 100_800_000,
    judgmentSource: 'self_report',
  });
  expect(result.evidenceStatus).toBe('later_recall_observed');
  expect(result.cleanGapMs).toBe(19 * 60_000);
  expect(result.exposureEligibleAt).toBe('2026-10-02T12:11:00.000Z');
});
it('T29: AC3 one/two later study days yield later recall/maintaining only for the exact task, cue family and locale', () => {
  const input = baseline();
  input.exposures = [];
  input.asOf = at('2026-10-03T12:00:00Z');
  input.attempts = [attempt('2026-10-02')];
  expect(inspectEvidence(input, fixture.eligibility).evidenceStatus).toBe('later_recall_observed');
  input.attempts.push(attempt('2026-10-03', 11));
  const result = inspectEvidence(input, fixture.eligibility);
  expect(result.evidenceStatus).toBe('maintaining');
  expect(result.qualifyingStudyDates).toEqual(['2026-10-02', '2026-10-03']);
  for (const task of [
    { ...input.task, id: id(30) },
    { ...input.task, cueFamily: 'written_nl' as const },
    { ...input.task, cueLocale: 'en' as const },
  ])
    expect(inspectEvidence({ ...input, task }, fixture.eligibility)).toMatchObject({
      evidenceStatus: 'acquiring',
      attempts: [],
      qualifyingStudyDates: [],
    });
});
it('T29: AC4 short-gap, same-day, assisted, practice and missing histories retain diagnostic reasons without delayed labels', () => {
  const clean = baseline();
  clean.exposures = [];
  clean.attempts = [attempt('2026-10-02')];
  const variants = [
    { ...clean, introducedStudyDate: '2026-10-02' },
    { ...clean, introducedAt: at('2026-10-02T07:00:00Z') },
    { ...clean, attempts: [{ ...clean.attempts[0]!, assisted: true }] },
    { ...clean, attempts: [{ ...clean.attempts[0]!, mode: 'extra_practice' }] },
    { ...clean, exposureHistory: 'missing' },
    { ...clean, introducedAt: null, introducedStudyDate: null },
  ];
  for (const input of variants) {
    const result = inspectEvidence(input, fixture.eligibility);
    expect(result.evidenceStatus).toBe('acquiring');
    expect(result.attempts[0]!.qualifiesDelayedRecall).toBe(false);
    expect(result.attempts[0]!.reasons.length).toBeGreaterThan(0);
  }
  expect(inspectEvidence(variants[1], fixture.eligibility).attempts[0]!.cleanGapMs).toBe(
    5 * 3_600_000,
  );
  expect(inspectEvidence(variants[4], fixture.eligibility)).toMatchObject({
    cleanGapMs: null,
    historyComplete: false,
    uncertainty: ['missing_exposure_history_or_introduction'],
  });
  clean.introducedAt = at('2026-10-02T02:00:00Z');
  clean.attempts[0]!.promptAt = at('2026-10-02T07:59:00Z');
  clean.attempts[0]!.responseLockedAt = at('2026-10-02T08:00:00Z');
  expect(inspectEvidence(clean, fixture.eligibility).attempts[0]!.qualifiesDelayedRecall).toBe(
    true,
  );
});
it('I06: valid ten-minute routine success has actual gap but no six-hour delayed label', () => {
  const input = baseline();
  input.attempts = [attempt('2026-10-02')];
  input.exposures[0]!.shownAt = at('2026-10-02T11:50:00Z');
  const result = inspectEvidence(input, fixture.eligibility);
  expect(result.eligibility.eligibleAt).toBe('2026-10-02T12:00:00Z');
  expect(result.attempts[0]).toMatchObject({
    independent: true,
    cleanGapMs: 600_000,
    qualifiesDelayedRecall: false,
  });
});
it('T29: same-day duplicates cannot establish maintaining, and relevant hints/resources remain inspectable', () => {
  const input = baseline();
  input.exposures = [];
  input.attempts = [
    attempt('2026-10-02'),
    { ...attempt('2026-10-02', 11), responseLockedAt: at('2026-10-02T12:01:00Z') },
  ];
  input.asOf += 60_000;
  expect(inspectEvidence(input, fixture.eligibility).evidenceStatus).toBe('later_recall_observed');
  const hint: Exposure = {
    ...(fixture.evidence.exposures[0] as Exposure),
    reason: 'hint',
    phase: 'before_response',
    shownAt: at('2026-10-02T11:59:30Z'),
    attemptId: id(10),
  };
  input.exposures = [hint];
  expect(inspectEvidence(input, fixture.eligibility).attempts[0]).toMatchObject({
    independent: false,
    assistanceBeforeResponse: [hint],
    qualifiesDelayedRecall: false,
  });
  input.exposures[0]!.targetSenseIds = [id(99)];
  expect(inspectEvidence(input, fixture.eligibility).relevantExposures).toEqual([]);
});
it('T29: needs-support requires recurring eligible difficulty in two sessions and a later independent success clears the streak', () => {
  const input = baseline();
  input.exposures = [];
  input.asOf = at('2026-10-03T12:00:00Z');
  input.attempts = [10, 11, 12].map((n) => ({ ...attempt('2026-10-02', n), initial: 'incorrect' }));
  expect(inspectEvidence(input, fixture.eligibility).evidenceStatus).toBe('needs_support');
  expect(
    inspectEvidence(
      { ...input, attempts: input.attempts.map((a) => ({ ...a, sessionId: id(20) })) },
      fixture.eligibility,
    ).evidenceStatus,
  ).toBe('acquiring');
  input.attempts.push(attempt('2026-10-03', 13));
  expect(inspectEvidence(input, fixture.eligibility).evidenceStatus).toBe('later_recall_observed');
});
it('W11: malformed versions, chronology, duplicates, unknown fields and unsafe policies fail closed', () => {
  const input = baseline();
  for (const patch of [
    { version: 2 },
    { asOf: 0 },
    { extra: true },
    { introducedStudyDate: null },
    { exposures: [input.exposures[0], input.exposures[0]] },
    { attempts: [{ ...attempt('2026-10-02'), promptAt: input.asOf + 1 }] },
    {
      policy: {
        acquisitionGapMinutes: -1,
        reviewGapMinutes: 10,
        delayedGapHours: 6,
        needsSupportFailures: 3,
      },
    },
  ])
    expect(() => inspectEvidence({ ...input, ...patch }, fixture.eligibility)).toThrow();
});
