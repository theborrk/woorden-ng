import attempt from '../../fixtures/runtime/event.json' with { type: 'json' };
import progress from '../../fixtures/runtime/progress.json' with { type: 'json' };
import profile from '../../fixtures/runtime/profile.json' with { type: 'json' };
import task from '../../fixtures/runtime/task.json' with { type: 'json' };
import session from '../../fixtures/runtime/session.json' with { type: 'json' };
import draft from '../../fixtures/runtime/draft.json' with { type: 'json' };
import enrollment from '../../fixtures/runtime/enrollment.json' with { type: 'json' };
import parameters from '../../fixtures/runtime/parameters.json' with { type: 'json' };
import exposure from '../../fixtures/runtime/exposure.json' with { type: 'json' };
import assistance from '../../fixtures/runtime/assistance.json' with { type: 'json' };
import { prepareWrite, stateHash } from '../../../src/application/persistence/model.ts';
import type { Progress } from '../../../src/application/persistence/model.ts';

export { profile };
export const fixtureId = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
// Existing runtime fixtures are prepared synthetic after-images, not newly computed grades.
export async function attemptInput(
  n = 1,
  before: Progress | null = null,
  parent: string | null = null,
) {
  const event = {
    ...structuredClone(attempt),
    scheduling: { ...structuredClone(attempt.scheduling), before: before?.scheduler ?? null },
    id: fixtureId(n),
    attemptId: fixtureId(n + 100),
    deviceSequence: n,
    expectedTaskRevision: before?.revision ?? 0,
    parentTransitionId: parent,
    expectedStateHash: await stateHash(before),
  };
  event.commitKey = `${event.profileId}:${event.attemptId}`;
  const after = {
    ...structuredClone(progress),
    revision: event.expectedTaskRevision + 1,
    scheduler: event.scheduling.after,
    eligibility: event.scheduling.eligibilityAfter,
    lastAttemptId: event.attemptId,
  };
  const override = {
    formatVersion: 1,
    kind: 'user_override',
    overrideVersion: 1,
    id: fixtureId(999),
    profileId: profile.id,
    revision: n,
    valueJson: '{"hook":"zażółć — русский 🚲"}',
  };
  return {
    event,
    before,
    parentTransitionId: parent,
    records: [after, task, session, draft, enrollment, parameters, override],
  };
}
export async function observation(
  n: number,
  kind: 'exposure' | 'assistance',
  profileId = profile.id,
  before: Progress | null = null,
  parent: string | null = null,
) {
  return prepareWrite({
    event: {
      ...structuredClone(kind === 'exposure' ? exposure : assistance),
      id: fixtureId(n),
      profileId,
      deviceSequence: n,
    },
    before,
    parentTransitionId: parent,
    records: [],
  });
}
