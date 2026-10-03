import { describe, expect, it } from 'vitest';
import {
  boundaryFixtures,
  disambiguationFixtures,
  reviewFixtures,
} from '../../../tests/fixtures/study-day';
import { oneStudyDayEligibility, studyDate, studyDayBoundary } from './study-day';
import { Temporal } from './temporal';

const zone = 'Europe/Amsterdam';

describe('one-study-day projection', () => {
  for (const fixture of reviewFixtures) {
    it(fixture.name, () => {
      expect(studyDate(fixture.instant, zone, '06:00')).toBe(fixture.studyDate);
      expect(oneStudyDayEligibility(fixture.instant, zone, '06:00')).toEqual({
        dueStudyDate: fixture.dueStudyDate,
        eligibleAt: fixture.eligibleAt,
        projectedInTimeZone: zone,
      });
    });
  }

  it('T20: the elapsed safeguard is injected and can be disabled', () => {
    expect(oneStudyDayEligibility('2026-10-02T01:00:00+02:00', zone, '06:00', 0).eligibleAt).toBe(
      '2026-10-02T04:00:00Z',
    );
    expect(oneStudyDayEligibility('2026-10-02T01:00:00+02:00', zone, '06:00', 8).eligibleAt).toBe(
      '2026-10-02T07:00:00Z',
    );
  });

  it.each([-1, 1.5, NaN, Infinity])('rejects invalid elapsed gap %s', (hours) => {
    expect(() => oneStudyDayEligibility('2026-10-02T01:00:00Z', zone, '06:00', hours)).toThrow(
      RangeError,
    );
  });
});

describe('study-day boundaries', () => {
  it.each([
    { instant: '2026-03-28T06:00:00Z', date: '2026-03-29', eligibleAt: '2026-03-29T01:30:00Z' },
    { instant: '2026-10-24T06:00:00Z', date: '2026-10-25', eligibleAt: '2026-10-25T00:30:00Z' },
  ])('T21: AC3 eligibility resolves the target 02:30 boundary on $date', (fixture) => {
    expect(oneStudyDayEligibility(fixture.instant, zone, '02:30')).toEqual({
      dueStudyDate: fixture.date,
      eligibleAt: fixture.eligibleAt,
      projectedInTimeZone: zone,
    });
  });

  it.each(boundaryFixtures)('T21: boundary $date at $boundary resolves to $start', (fixture) => {
    expect(studyDayBoundary(fixture.date, zone, fixture.boundary)).toBe(fixture.start);
    const before = Temporal.Instant.from(fixture.start).subtract({ nanoseconds: 1 }).toString();
    expect(studyDate(before, zone, fixture.boundary)).toBe(
      Temporal.PlainDate.from(fixture.date).subtract({ days: 1 }).toString(),
    );
    expect(studyDate(fixture.start, zone, fixture.boundary)).toBe(fixture.date);
  });

  it.each(disambiguationFixtures)('T21: AC3 compatible 02:30 maps $instant to $date', (fixture) => {
    expect(studyDate(fixture.instant, zone, '02:30')).toBe(fixture.date);
  });

  it.each([
    { date: '2026-03-28', start: '2026-03-28T05:00:00Z', end: '2026-03-29T04:00:00Z', hours: 23 },
    { date: '2026-10-24', start: '2026-10-24T04:00:00Z', end: '2026-10-25T05:00:00Z', hours: 25 },
  ])('T21: AC3 every minute of the $hours-hour day has one contiguous label', (fixture) => {
    const start = Temporal.Instant.from(fixture.start);
    const end = Temporal.Instant.from(fixture.end);
    expect(start.until(end).total('hours')).toBe(fixture.hours);
    for (let at = start; Temporal.Instant.compare(at, end) < 0; at = at.add({ minutes: 1 })) {
      expect(studyDate(at.toString(), zone, '06:00')).toBe(fixture.date);
    }
    expect(studyDate(end.toString(), zone, '06:00')).toBe(
      Temporal.PlainDate.from(fixture.date).add({ days: 1 }).toString(),
    );
  });

  it('T21: AC4 leap day is a full study date between February 28 and March 1', () => {
    expect(studyDate('2028-02-29T04:59:59Z', zone, '06:00')).toBe('2028-02-28');
    expect(studyDate('2028-02-29T05:00:00Z', zone, '06:00')).toBe('2028-02-29');
    expect(studyDate('2028-03-01T04:59:59Z', zone, '06:00')).toBe('2028-02-29');
    expect(studyDate('2028-03-01T05:00:00Z', zone, '06:00')).toBe('2028-03-01');
  });

  it('T22: projection uses the supplied zone, even when the instant carries another offset', () => {
    const instant = '2026-10-02T05:00:00Z';
    expect(studyDate(instant, zone, '06:00')).toBe('2026-10-02');
    expect(studyDate(instant, 'UTC', '06:00')).toBe('2026-10-01');
    expect(studyDate('2026-10-02T07:00:00+02:00', 'UTC', '06:00')).toBe('2026-10-01');
  });

  it('rejects malformed instants, time zones, and boundaries instead of normalizing them', () => {
    expect(() => studyDate('2026-10-02T01:00', zone, '06:00')).toThrow(RangeError);
    expect(() => studyDate('2026-10-02T01:00Z', 'Not/A_Zone', '06:00')).toThrow(RangeError);
    expect(() => studyDate('2026-10-02T01:00Z', zone, '25:00')).toThrow(RangeError);
  });
});
