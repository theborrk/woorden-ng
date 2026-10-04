import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { Profiles } from './Profiles';
import { createLocalization } from '../../../i18n';
import { preferenceRecord, profileRecord } from '../../../application/profiles/service';
import type { ProfileService, ProfileSnapshot } from '../../../application/profiles/service';

const profileId = '10000000-0000-4000-8000-000000000001';
const fixture: ProfileSnapshot = {
  profiles: [
    profileRecord({
      formatVersion: 1,
      kind: 'profile',
      profileVersion: 1,
      id: profileId,
      createdAt: 0,
      name: 'Profile A',
    }),
  ],
  preferences: preferenceRecord({
    formatVersion: 1,
    kind: 'preferences',
    preferencesVersion: 1,
    profileId,
    revision: 0,
    updatedAt: 0,
    interfaceLocale: 'en',
    cueLocale: 'pl',
    timeZone: 'UTC',
    studyDayBoundaryMinutes: 360,
    dailyNewConceptBudget: 2,
    dailyReviewBudget: 20,
    goal: 'everyday',
    capabilities: { audio: false, microphone: false },
    consent: { diagnostics: false, experiments: false },
  }),
  installation: {
    id: 'installation',
    deviceId: '10000000-0000-4000-8000-000000000002',
    activeProfileId: profileId,
    webSchemaVersion: 1,
    logicalFormatVersion: 1,
    projectionVersion: 1,
  },
};
afterEach(cleanup);
it('I18: AC1/AC4 only a completed commit reports saved; rejection retains edited values', async () => {
  let rejectSave: (reason: Error) => void = () => {
    throw new Error('Save did not start');
  };
  const save = vi.fn(
    () =>
      new Promise<ProfileSnapshot>((_resolve, reject) => {
        rejectSave = reject;
      }),
  );
  const service: ProfileService = {
    load: () => Promise.resolve(fixture),
    create: () => Promise.resolve(fixture),
    select: () => Promise.resolve(fixture),
    save,
  };
  render(
    <I18nextProvider i18n={createLocalization('en')}>
      <Profiles service={service} visible />
    </I18nextProvider>,
  );
  const input = await screen.findByLabelText('Time zone');
  await userEvent.setup().clear(input);
  await userEvent.setup().type(input, 'Europe/Warsaw');
  await userEvent.setup().click(screen.getByRole('button', { name: 'Save preferences' }));
  expect(screen.queryByText('Saved on this installation.')).toBeNull();
  expect(screen.getByText('Saving or loading…')).toBeDefined();
  await act(async () => {
    rejectSave(new Error('Commit rejected'));
    await Promise.resolve();
  });
  expect(screen.getByRole('alert').textContent).toContain('Your edits are retained');
  expect((input as HTMLInputElement).value).toBe('Europe/Warsaw');
  expect(screen.getByLabelText<HTMLSelectElement>('Learning language').value).toBe('pl');
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({ timeZone: 'Europe/Warsaw', cueLocale: 'pl' }),
  );
});
