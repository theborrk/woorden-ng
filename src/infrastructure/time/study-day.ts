import { Temporal } from './temporal';

export interface OneStudyDayEligibility {
  dueStudyDate: string;
  eligibleAt: string;
  projectedInTimeZone: string;
}

/** Resolve an ISO study date's boundary to a UTC instant. */
export function studyDayBoundary(date: string, zone: string, boundary: string): string {
  const local = Temporal.PlainDate.from(date).toPlainDateTime(Temporal.PlainTime.from(boundary));
  return local.toZonedDateTime(zone, { disambiguation: 'compatible' }).toInstant().toString();
}

/** Label an injected instant with the ISO date on which its study day began. */
export function studyDate(instant: string, zone: string, boundary: string): string {
  const at = Temporal.Instant.from(instant);
  const date = at.toZonedDateTimeISO(zone).toPlainDate();
  const start = Temporal.Instant.from(studyDayBoundary(date.toString(), zone, boundary));

  // Comparing resolved instants prevents a repeated local hour from reopening yesterday.
  return (Temporal.Instant.compare(at, start) < 0 ? date.subtract({ days: 1 }) : date).toString();
}

/** Spike only: one calendar study day, followed by an elapsed-time safeguard. */
export function oneStudyDayEligibility(
  instant: string,
  zone: string,
  boundary: string,
  minimumGapHours = 6,
): OneStudyDayEligibility {
  if (!Number.isSafeInteger(minimumGapHours) || minimumGapHours < 0) {
    throw new RangeError('minimumGapHours must be a nonnegative safe integer');
  }

  const dueStudyDate = Temporal.PlainDate.from(studyDate(instant, zone, boundary))
    .add({ days: 1 })
    .toString();
  const start = Temporal.Instant.from(studyDayBoundary(dueStudyDate, zone, boundary));
  const minimumGap = Temporal.Instant.from(instant).add({ hours: minimumGapHours });
  const eligibleAt = Temporal.Instant.compare(start, minimumGap) < 0 ? minimumGap : start;

  return { dueStudyDate, eligibleAt: eligibleAt.toString(), projectedInTimeZone: zone };
}
