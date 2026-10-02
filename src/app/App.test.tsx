import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { App } from './App';
import { browserLanguage, createLocalization, languageKey } from '../i18n';
import type { TargetServices } from '../targets/types';

const noUpdates = { registerUpdates() {} };
function mount(updates: Pick<TargetServices, 'registerUpdates'> = noUpdates, name = 'Woorden') {
  const i18n = createLocalization('en');
  return render(
    <I18nextProvider i18n={i18n}>
      <App name={name} platform="browser" updates={updates} />
    </I18nextProvider>,
  );
}

beforeEach(() => {
  window.history.replaceState(null, '', '#/today');
  window.sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('React shell', () => {
  it('W04: renders the app name as text, platform, and all five routes', () => {
    mount(noUpdates, '<img src=x onerror=alert(1)>');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      '<img src=x onerror=alert(1)>',
    );
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('platform').textContent).toBe('Running as: Browser');
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '#/today',
      '#/study',
      '#/library',
      '#/progress',
      '#/settings',
    ]);
  });

  it('F06: switches navigation, screen title and document language to Polish without remounting', async () => {
    window.history.replaceState(null, '', '#/settings');
    mount();
    const heading = screen.getByRole('heading', { level: 1 });
    await userEvent.setup().selectOptions(screen.getByLabelText('Interface language'), 'pl');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Ustawienia');
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Dzisiaj',
      'Nauka',
      'Biblioteka',
      'Postępy',
      'Ustawienia',
    ]);
    expect(screen.getByRole('heading', { level: 1 })).toBe(heading);
    expect(document.documentElement.lang).toBe('pl');
    expect(window.sessionStorage.getItem(languageKey)).toBe('pl');
    await userEvent.setup().selectOptions(screen.getByLabelText('Język interfejsu'), 'en');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Settings');
  });

  it('F06: chooses a supported browser language and otherwise falls back to English', () => {
    expect(browserLanguage(['pl-PL', 'en-US'])).toBe('pl');
    expect(browserLanguage(['en-GB', 'pl'])).toBe('en');
    expect(browserLanguage(['fr', 'pl-PL'])).toBe('pl');
    expect(browserLanguage(['ru', 'nl'])).toBe('en');
    expect(browserLanguage([])).toBe('en');
  });

  it('F06: shows a visible error if session persistence is unavailable', async () => {
    window.history.replaceState(null, '', '#/settings');
    vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('Unavailable');
    });
    mount();
    await userEvent.setup().selectOptions(screen.getByLabelText('Interface language'), 'pl');
    expect(screen.getByRole('alert').textContent).toContain('Nie udało się zapisać języka');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Ustawienia');
  });

  it('W04: handles direct routes, hash changes, and browser back with predictable focus', () => {
    window.history.replaceState(null, '', '#/study');
    mount();
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Study');
    act(() => {
      window.history.replaceState(null, '', '#/progress');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Progress');
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2 }));
  });

  it('W04: defaults empty or unknown hashes to Today', () => {
    window.history.replaceState(null, '', '#/unknown');
    mount();
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Today');
    expect(window.location.hash).toBe('#/today');
  });

  it('W04: catches connectivity changes between rendering and subscription', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValueOnce(true).mockReturnValue(false);
    mount();
    expect(screen.getByTestId('network').dataset['state']).toBe('offline');
  });

  it('W04: updates network status and removes listeners after unmount', () => {
    const view = mount();
    fireEvent(window, new Event('offline'));
    expect(screen.getByTestId('network').dataset['state']).toBe('offline');
    fireEvent(window, new Event('online'));
    expect(screen.getByTestId('network').dataset['state']).toBe('online');
    const remove = vi.spyOn(window, 'removeEventListener');
    view.unmount();
    expect(remove).toHaveBeenCalledWith('offline', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('hashchange', expect.any(Function));
  });

  it('W04: a waiting service worker displays a banner and its button activates the update', async () => {
    let onUpdate: ((applyUpdate: () => void) => void) | undefined;
    mount({
      registerUpdates(callback) {
        onUpdate = callback;
      },
    });
    expect(screen.queryByTestId('update-banner')).toBeNull();
    const activate = vi.fn();
    act(() => {
      onUpdate?.(activate);
    });
    expect(screen.getByRole('alert').textContent).toContain('A new version is available.');
    expect(activate).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reload' }));
    expect(activate).toHaveBeenCalledOnce();
  });
});
