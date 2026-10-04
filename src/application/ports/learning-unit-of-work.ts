import type { RuntimeRecord } from '../../contracts/runtime/records';
export type Profile = Extract<RuntimeRecord, { kind: 'profile' }>;
export type Preferences = Extract<RuntimeRecord, { kind: 'preferences' }>;
export interface Installation {
  id: 'installation';
  deviceId: string;
  activeProfileId: string | null;
  webSchemaVersion: 1;
  logicalFormatVersion: 1;
  projectionVersion: 1;
}
/** Repositories are valid only inside the callback; no vendor handles cross this port. */
export interface ProfileRepositories {
  profiles(): Promise<Profile[]>;
  preferences(profileId: string): Promise<Preferences | undefined>;
  installation(): Promise<Installation | undefined>;
  addProfile(profile: Profile): Promise<void>;
  putPreferences(preferences: Preferences): Promise<void>;
  putInstallation(installation: Installation): Promise<void>;
}
export interface LearningUnitOfWork {
  read<T>(work: (repositories: ProfileRepositories) => Promise<T>): Promise<T>;
  write<T>(work: (repositories: ProfileRepositories) => Promise<T>): Promise<T>;
}
