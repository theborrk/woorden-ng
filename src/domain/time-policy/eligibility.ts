import { Temporal } from '../../infrastructure/time/temporal.ts';
import { studyDate, studyDayBoundary } from '../../infrastructure/time/study-day.ts';
import {
  count,
  enumeration,
  object,
  optional,
  text,
  zone,
} from '../../contracts/runtime/schema.ts';

export const policyVersion = 'calendar-v1-compatible-skip-empty';
const inputSchema = object({
  version: enumeration(1),
  reviewedAt: text,
  rawDueAt: text,
  timeZone: zone,
  boundary: text,
  phase: enumeration('new', 'learning', 'review', 'relearning'),
  scheduledDays: count,
  minimumGapHours: optional(count),
  exposureEligibleAt: optional(text),
  siblingEligibleAt: optional(text),
  postponedUntil: optional(text),
  window: optional(object({ start: text, end: text })),
});
export type GateReason =
  'engine_due' | 'study_day' | 'minimum_gap' | 'exposure' | 'sibling_exposure' | 'postponed';

function localTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) throw new RangeError('Expected local HH:mm time');
  return Temporal.PlainTime.from(value);
}
function start(date: string, timeZone: string, boundary: string) {
  return Temporal.Instant.from(studyDayBoundary(date, timeZone, boundary));
}
function following(date: string) {
  return Temporal.PlainDate.from(date).add({ days: 1 }).toString();
}

/** A skipped calendar date may resolve to the same boundary as its successor. */
function nonemptyDay(date: string, timeZone: string, boundary: string) {
  for (let skipped = 0; skipped < 8; skipped++) {
    const at = start(date, timeZone, boundary);
    const end = start(following(date), timeZone, boundary);
    if (Temporal.Instant.compare(at, end) < 0) return { date, at };
    date = following(date);
  }
  throw new RangeError('Cannot resolve a nonempty study day');
}
function attemptDate(instant: string, timeZone: string, boundary: string) {
  const at = Temporal.Instant.from(instant);
  let date = studyDate(instant, timeZone, boundary);
  // T-003's previous-calendar-date label can be empty after an entire date was skipped.
  for (let shifted = 0; shifted < 8; shifted++) {
    if (Temporal.Instant.compare(at, start(date, timeZone, boundary)) < 0) {
      date = Temporal.PlainDate.from(date).subtract({ days: 1 }).toString();
    } else if (Temporal.Instant.compare(at, start(following(date), timeZone, boundary)) >= 0) {
      date = following(date);
    } else return date;
  }
  throw new RangeError('Cannot label the resolved study day');
}
function suggestWindow(
  eligibleAt: string,
  timeZone: string,
  window: { start: string; end: string },
) {
  const beginTime = localTime(window.start);
  const endTime = localTime(window.end);
  const order = Temporal.PlainTime.compare(beginTime, endTime);
  if (order === 0) throw new RangeError('Review window must have distinct start and end');
  const eligible = Temporal.Instant.from(eligibleAt);
  let date = eligible.toZonedDateTimeISO(timeZone).toPlainDate().subtract({ days: 1 });
  for (let offset = 0; offset < 8; offset++, date = date.add({ days: 1 })) {
    const endDate = order > 0 ? date.add({ days: 1 }) : date;
    const begin = date
      .toPlainDateTime(beginTime)
      .toZonedDateTime(timeZone, { disambiguation: 'compatible' })
      .toInstant();
    const end = endDate
      .toPlainDateTime(endTime)
      .toZonedDateTime(timeZone, { disambiguation: 'compatible' })
      .toInstant();
    // Empty/inverted windows after a timezone transition are skipped, never made mandatory.
    if (Temporal.Instant.compare(begin, end) >= 0 || Temporal.Instant.compare(eligible, end) >= 0)
      continue;
    return {
      startAt: begin.toString(),
      endAt: end.toString(),
      suggestedAt: Temporal.Instant.compare(eligible, begin) < 0 ? begin.toString() : eligibleAt,
    };
  }
  throw new RangeError('Cannot resolve a future review window');
}

/** Pure projection: no clock, stored history, scheduler vendor state or attendance requirement. */
export function projectEligibility(value: unknown) {
  const input = inputSchema(value, '$');
  localTime(input.boundary);
  const reviewedAt = Temporal.Instant.from(input.reviewedAt);
  Temporal.Instant.from(input.rawDueAt);
  const currentStudyDate = attemptDate(input.reviewedAt, input.timeZone, input.boundary);
  const gates: { reason: GateReason; at: string }[] = [];
  let nominalDueStudyDate: string | null = null;
  let dueStudyDate: string | null = null;
  if (input.phase === 'review' && input.scheduledDays >= 1) {
    nominalDueStudyDate = Temporal.PlainDate.from(currentStudyDate)
      .add({ days: input.scheduledDays })
      .toString();
    const target = nonemptyDay(nominalDueStudyDate, input.timeZone, input.boundary);
    dueStudyDate = target.date;
    gates.push(
      { reason: 'study_day', at: target.at.toString() },
      {
        reason: 'minimum_gap',
        at: reviewedAt.add({ hours: input.minimumGapHours ?? 6 }).toString(),
      },
    );
  } else gates.push({ reason: 'engine_due', at: Temporal.Instant.from(input.rawDueAt).toString() });
  for (const [reason, at] of [
    ['exposure', input.exposureEligibleAt],
    ['sibling_exposure', input.siblingEligibleAt],
    ['postponed', input.postponedUntil],
  ] as const) {
    if (at !== undefined) gates.push({ reason, at: Temporal.Instant.from(at).toString() });
  }
  const eligibleAt = gates.reduce(
    (latest, gate) =>
      Temporal.Instant.compare(Temporal.Instant.from(gate.at), Temporal.Instant.from(latest)) > 0
        ? gate.at
        : latest,
    gates[0]!.at,
  );
  return {
    policyVersion,
    reviewedAt: input.reviewedAt,
    rawDueAt: input.rawDueAt,
    projectedInTimeZone: input.timeZone,
    currentStudyDate,
    nominalDueStudyDate,
    dueStudyDate,
    eligibleAt,
    gates,
    reasons: gates.map((gate) => gate.reason),
    controllingReasons: gates
      .filter(
        (gate) =>
          Temporal.Instant.compare(
            Temporal.Instant.from(gate.at),
            Temporal.Instant.from(eligibleAt),
          ) === 0,
      )
      .map((gate) => gate.reason),
    suggestedWindow: input.window ? suggestWindow(eligibleAt, input.timeZone, input.window) : null,
  };
}
