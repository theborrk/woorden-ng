import { readFileSync } from 'node:fs';

export const fixtureNames = [
  'profile',
  'preferences',
  'task',
  'enrollment',
  'progress',
  'session',
  'draft',
  'scheduler',
  'parameters',
  'event',
  'assistance',
  'exposure',
  'introduction',
  'correction',
  'undo',
  'administrative',
];
export function fixture(name: string): Record<string, unknown> {
  // Fixtures are parsed afresh so mutation tests do not share input state.
  const value: unknown = JSON.parse(
    readFileSync(new URL(`./${name}.json`, import.meta.url), 'utf8'),
  );
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected fixture object');
  return value as Record<string, unknown>;
}
export function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, child]) => [key, reverseKeys(child)]),
    );
  }
  return value;
}
export const rejectionCases = [
  { name: 'profile', patch: { profileVersion: 99 }, field: '$/profileVersion' },
  { name: 'event', patch: { eventVersion: 99 }, field: '$/eventVersion' },
  { name: 'event', patch: { occurredAt: Number.MAX_SAFE_INTEGER + 1 }, field: '$/occurredAt' },
  { name: 'event', patch: { inputMode: 'external_tutor' }, field: '$/inputMode' },
  { name: 'event', patch: { promptContext: undefined }, field: '$/promptContext' },
];
