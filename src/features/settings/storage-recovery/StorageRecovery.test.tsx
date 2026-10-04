import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createLocalization } from '../../../i18n';
import { StorageRecoveryScreen } from './StorageRecovery';
afterEach(cleanup);
it('T63: AC2 safe retry and supported export are visible; unknown schemas have no export', async () => {
  const retry = vi.fn();
  const recovery = {
    state: () => ({ reason: 'migration' as const, exportSupported: true }),
    exportProfiles: vi.fn(() => Promise.resolve('{"kind":"local-profile-recovery"}')),
  };
  const { unmount } = render(
    <I18nextProvider i18n={createLocalization('en')}>
      <StorageRecoveryScreen recovery={recovery} retry={retry} />
    </I18nextProvider>,
  );
  await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
  expect(retry).toHaveBeenCalledOnce();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Export local profiles' }));
  expect((await screen.findByRole<HTMLTextAreaElement>('textbox')).value).toContain(
    'local-profile-recovery',
  );
  unmount();
  render(
    <I18nextProvider i18n={createLocalization('en')}>
      <StorageRecoveryScreen
        recovery={{ ...recovery, state: () => ({ reason: 'newer', exportSupported: false }) }}
        retry={retry}
      />
    </I18nextProvider>,
  );
  expect(screen.getByText(/needs a newer app/)).toBeDefined();
  expect(screen.queryByRole('button', { name: 'Export local profiles' })).toBeNull();
});
