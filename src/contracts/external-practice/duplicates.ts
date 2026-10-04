import type { ExternalPracticeObservationV1 } from './schemas.ts';

/** Inputs must first pass the observation schema; this function performs no writes. */
export function classifyDuplicate(
  observation: ExternalPracticeObservationV1,
  previous: readonly ExternalPracticeObservationV1[],
): 'new' | 'identical' | 'conflict' {
  const matches = previous.filter((item) => item.id === observation.id);
  if (matches.some((item) => item.payloadHash !== observation.payloadHash)) return 'conflict';
  return matches.length > 0 ? 'identical' : 'new';
}
