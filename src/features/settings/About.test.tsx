import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { App } from '../../app/App';
import { createLocalization } from '../../i18n';
import type { AppInfo } from '../../application/ports/app-info';

afterEach(cleanup);

function mount(appInfo: AppInfo) {
  window.history.replaceState(null, '', '#/settings');
  return render(
    <I18nextProvider i18n={createLocalization('en')}>
      <App name="Woorden" platform="android" updates={{ registerUpdates() {} }} appInfo={appInfo} />
    </I18nextProvider>,
  );
}

it('W04: Settings About reads the injected port regardless of the displayed platform', async () => {
  const getInfo = vi.fn(() => Promise.resolve({ version: '<b>1.2.3</b>', build: 'abc1234' }));
  mount({ getInfo });
  expect(
    within(screen.getByRole('region', { name: 'About' })).getByRole('status').textContent,
  ).toContain('Loading app information');
  expect((await screen.findByTestId('app-version')).textContent).toBe('<b>1.2.3</b>');
  expect(screen.getByTestId('app-build').textContent).toBe('abc1234');
  expect(document.querySelector('dd b')).toBeNull();
  expect(getInfo).toHaveBeenCalledOnce();
  await userEvent.setup().selectOptions(screen.getByLabelText('Interface language'), 'pl');
  expect(screen.getByRole('region', { name: 'O aplikacji' }).textContent).toContain('Wersja');
  expect(screen.getByRole('region', { name: 'O aplikacji' }).textContent).toContain('Kompilacja');
  expect(screen.getByTestId('app-build').textContent).toBe('abc1234');
  expect(getInfo).toHaveBeenCalledOnce();
});

it('W47: unavailable app information is visible and reopening Settings retries the port', async () => {
  const getInfo = vi
    .fn<AppInfo['getInfo']>()
    .mockRejectedValueOnce(new Error('Native unavailable'))
    .mockResolvedValue({ version: 'native-version', build: '98765' });
  mount({ getInfo });
  expect((await screen.findByRole('alert')).textContent).toContain(
    'App information is unavailable',
  );
  expect(screen.queryByTestId('app-version')).toBeNull();
  await userEvent.setup().click(screen.getByRole('link', { name: 'Today' }));
  await userEvent.setup().click(screen.getByRole('link', { name: 'Settings' }));
  expect((await screen.findByTestId('app-version')).textContent).toBe('native-version');
  expect(screen.getByTestId('app-build').textContent).toBe('98765');
  expect(getInfo).toHaveBeenCalledTimes(2);
});
