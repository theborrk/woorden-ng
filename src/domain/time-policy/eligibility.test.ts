import { expect, it } from 'vitest';
import { projectEligibility, policyVersion } from './eligibility';
import cases from '../../../tests/fixtures/learning/eligibility/cases.json';

for (const fixture of cases) {
  it(fixture.name, () => {
    const before = JSON.stringify(fixture.input);
    const result = projectEligibility(fixture.input);
    expect(result).toMatchObject(fixture.expected);
    expect(result.policyVersion).toBe(policyVersion);
    expect(result.rawDueAt).toBe(fixture.input.rawDueAt);
    expect(result.reviewedAt).toBe(fixture.input.reviewedAt);
    expect(result.projectedInTimeZone).toBe(fixture.input.timeZone);
    expect(JSON.stringify(fixture.input)).toBe(before);
  });
}
it('I10: AC4 calendar projection replaces raw engine eligibility; all gates and ties remain inspectable', () => {
  const fixture = cases[0]!;
  const result = projectEligibility({
    ...fixture.input,
    siblingEligibleAt: '2026-10-02T06:00:00Z',
    postponedUntil: '2026-10-02T06:00:00Z',
  });
  expect(result.eligibleAt).toBe('2026-10-02T06:00:00Z');
  expect(result.rawDueAt).toBe('2026-10-03T01:00:00+02:00');
  expect(result.controllingReasons).toEqual(['sibling_exposure', 'postponed']);
  expect(result.reasons).toEqual(['study_day', 'minimum_gap', 'sibling_exposure', 'postponed']);
  expect(result.gates[1]).toEqual({ reason: 'minimum_gap', at: '2026-10-02T05:00:00Z' });
});
it('T20: AC2 configured minimum gap can be disabled without changing raw due', () => {
  expect(projectEligibility({ ...cases[0]!.input, minimumGapHours: 0 })).toMatchObject({
    eligibleAt: '2026-10-02T04:00:00Z',
    rawDueAt: cases[0]!.input.rawDueAt,
  });
});
it('T21: resolved overlap labels do not reopen yesterday after the clock repeats', () => {
  for (const instant of ['2026-10-25T00:30:00Z', '2026-10-25T01:00:00Z', '2026-10-25T01:29:59Z']) {
    expect(
      projectEligibility({ ...cases[0]!.input, reviewedAt: instant, boundary: '02:30' })
        .currentStudyDate,
    ).toBe('2026-10-25');
  }
  expect(
    projectEligibility({
      ...cases[0]!.input,
      reviewedAt: '2026-10-25T00:29:59Z',
      boundary: '02:30',
    }).currentStudyDate,
  ).toBe('2026-10-24');
});
it('T21: an empty spring-gap window moves only the optional suggestion', () => {
  const result = projectEligibility({
    ...cases[6]!.input,
    window: { start: '02:30', end: '03:00' },
  });
  expect(result.eligibleAt).toBe('2026-03-29T01:30:00Z');
  expect(result.suggestedWindow).toEqual({
    startAt: '2026-03-30T00:30:00Z',
    endAt: '2026-03-30T01:00:00Z',
    suggestedAt: '2026-03-30T00:30:00Z',
  });
});
for (const patch of [
  { version: 2 },
  { scheduledDays: 1.5 },
  { scheduledDays: -1 },
  { minimumGapHours: -1 },
  { timeZone: 'Invalid/Zone' },
  { reviewedAt: '2026-10-02T01:00' },
  { rawDueAt: 'invalid' },
  { boundary: '25:00' },
  { boundary: '06:00:30' },
  { exposureEligibleAt: 'bad' },
  { window: { start: '10:30', end: '10:30' } },
  { window: { start: '25:00', end: '10:00' } },
  { extra: true },
]) {
  it(`W11: invalid projection input is rejected: ${JSON.stringify(patch)}`, () => {
    expect(() => projectEligibility({ ...cases[0]!.input, ...patch })).toThrow();
  });
}
