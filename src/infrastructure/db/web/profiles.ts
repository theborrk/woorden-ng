import { Dexie } from 'dexie';
import { learningStores } from './learning-schema.ts';
import type { DexieOptions, Table } from 'dexie';
import type {
  Installation,
  LearningUnitOfWork,
  Preferences,
  Profile,
  ProfileRepositories,
} from '../../../application/ports/learning-unit-of-work';
import {
  installationRecord,
  preferenceRecord,
  profileRecord,
} from '../../../application/profiles/service';

export const profileDatabaseName = 'woorden-ng';
export class ProfileDatabase extends Dexie implements LearningUnitOfWork {
  readonly profiles!: Table<Profile, string>;
  readonly preferences!: Table<Preferences, string>;
  readonly metadata!: Table<Installation, string>;
  constructor(name = profileDatabaseName, options?: DexieOptions) {
    super(name, options);
    this.version(1).stores({ profiles: 'id', preferences: 'profileId', metadata: 'id' });
    this.version(2)
      .stores({ ...learningStores })
      .upgrade(async (transaction) => {
        const metadata = transaction.table<Installation, string>('metadata');
        const old = await metadata.get('installation');
        if (old) await metadata.put({ ...installationRecord(old, '$'), webSchemaVersion: 2 });
      });
  }
  private execute<T>(
    mode: 'r' | 'rw',
    work: (repositories: ProfileRepositories) => Promise<T>,
  ): Promise<T> {
    return this.transaction(mode, [this.profiles, this.preferences, this.metadata], async () => {
      let active = true;
      const scoped = <R>(action: () => Promise<R>) => {
        if (!active) throw new Error('Repository transaction has ended');
        return action();
      };
      const repo: ProfileRepositories = {
        profiles: () => scoped(async () => (await this.profiles.toArray()).map(profileRecord)),
        preferences: (profileId) =>
          scoped(async () => {
            const row = await this.preferences.get(profileId);
            return row && preferenceRecord(row);
          }),
        installation: () =>
          scoped(async () => {
            const row = await this.metadata.get('installation');
            return row && installationRecord(row, '$');
          }),
        addProfile: (profile) =>
          scoped(async () => {
            await this.profiles.add(profileRecord(profile));
          }),
        putPreferences: (preferences) =>
          scoped(async () => {
            await this.preferences.put(preferenceRecord(preferences));
          }),
        putInstallation: (installation) =>
          scoped(async () => {
            await this.metadata.put(installationRecord(installation, '$'));
          }),
      };
      try {
        return await work(repo);
      } finally {
        active = false;
      }
    });
  }
  read<T>(work: (repositories: ProfileRepositories) => Promise<T>) {
    return this.execute('r', work);
  }
  write<T>(work: (repositories: ProfileRepositories) => Promise<T>) {
    return this.execute('rw', work);
  }
}
