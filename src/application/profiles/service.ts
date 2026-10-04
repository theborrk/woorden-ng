import { allocateIdentity, validateRecord } from '../../contracts/runtime/records';
import { enumeration, id, nullable, object } from '../../contracts/runtime/schema';
import type {
  Installation,
  LearningUnitOfWork,
  Preferences,
  Profile,
  ProfileRepositories,
} from '../ports/learning-unit-of-work';

export const workloadDefaults = { activeAcquiringTasks: 6, sessionMinutes: 10 } as const;
export function profileRecord(value: unknown): Profile {
  const record = validateRecord(value);
  if (record.kind !== 'profile') throw new Error('Expected profile');
  if (!record.name.trim()) throw new Error('Profile name is required');
  return record;
}
export function preferenceRecord(value: unknown): Preferences {
  const record = validateRecord(value);
  if (record.kind !== 'preferences') throw new Error('Expected preferences');
  return record;
}
export const installationRecord = object({
  id: enumeration('installation'),
  deviceId: id,
  activeProfileId: nullable(id),
  webSchemaVersion: enumeration(1),
  logicalFormatVersion: enumeration(1),
  projectionVersion: enumeration(1),
});
export interface ProfileSnapshot {
  profiles: Profile[];
  preferences: Preferences;
  installation: Installation;
}
export interface ProfileService {
  load(locale: 'en' | 'pl', timeZone: string): Promise<ProfileSnapshot>;
  create(name: string, locale: 'en' | 'pl', timeZone: string): Promise<ProfileSnapshot>;
  select(profileId: string): Promise<ProfileSnapshot>;
  save(value: unknown): Promise<ProfileSnapshot>;
}
export function createProfileService(
  uow: LearningUnitOfWork,
  allocateId: () => string,
  now: () => number,
): ProfileService {
  const defaults = (profileId: string, locale: 'en' | 'pl', timeZone: string) =>
    preferenceRecord({
      formatVersion: 1,
      kind: 'preferences',
      preferencesVersion: 1,
      profileId,
      revision: 0,
      updatedAt: now(),
      interfaceLocale: locale,
      cueLocale: locale,
      timeZone,
      studyDayBoundaryMinutes: 360,
      dailyNewConceptBudget: 2,
      dailyReviewBudget: 20,
      goal: 'everyday',
      capabilities: { audio: false, microphone: false },
      consent: { diagnostics: false, experiments: false },
    });
  async function snapshot(repo: ProfileRepositories): Promise<ProfileSnapshot> {
    const installation = await repo.installation();
    if (!installation?.activeProfileId) throw new Error('No selected profile');
    const preferences = await repo.preferences(installation.activeProfileId);
    const profiles = await repo.profiles();
    if (!preferences || !profiles.some((p) => p.id === installation.activeProfileId))
      throw new Error('Profile data is incomplete');
    return { installation, preferences, profiles };
  }
  async function add(
    repo: ProfileRepositories,
    name: string,
    locale: 'en' | 'pl',
    timeZone: string,
  ) {
    const identity = allocateIdentity(allocateId, now);
    const profile = profileRecord({
      formatVersion: 1,
      kind: 'profile',
      profileVersion: 1,
      ...identity,
      name,
    });
    const preferences = defaults(profile.id, locale, timeZone);
    const existing = await repo.installation();
    const installation = installationRecord(
      {
        id: 'installation',
        deviceId: existing?.deviceId ?? allocateId(),
        activeProfileId: profile.id,
        webSchemaVersion: 1,
        logicalFormatVersion: 1,
        projectionVersion: 1,
      },
      '$',
    );
    await repo.addProfile(profile);
    await repo.putPreferences(preferences);
    await repo.putInstallation(installation);
    return snapshot(repo);
  }
  return {
    load: (locale, timeZone) =>
      uow.write(async (repo) =>
        (await repo.installation()) ? snapshot(repo) : add(repo, 'Local profile', locale, timeZone),
      ),
    create: (name, locale, timeZone) => uow.write((repo) => add(repo, name, locale, timeZone)),
    select: (profileId) =>
      uow.write(async (repo) => {
        const current = await snapshot(repo);
        if (!current.profiles.some((p) => p.id === profileId)) throw new Error('Unknown profile');
        await repo.putInstallation({ ...current.installation, activeProfileId: profileId });
        return snapshot(repo);
      }),
    save: (value) => {
      const candidate = preferenceRecord(value);
      return uow.write(async (repo) => {
        const current = await snapshot(repo);
        if (
          candidate.profileId !== current.preferences.profileId ||
          candidate.revision !== current.preferences.revision
        )
          throw new Error('Preferences changed; reopen Settings to refresh');
        await repo.putPreferences(
          preferenceRecord({ ...candidate, revision: candidate.revision + 1, updatedAt: now() }),
        );
        return snapshot(repo);
      });
    },
  };
}
