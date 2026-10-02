import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from './app';

describe('renderApp', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
  });

  it('renders the app name and platform', () => {
    renderApp(root, { name: 'My App', platform: 'pwa', online: true });
    expect(root.querySelector('h1')?.textContent).toBe('My App');
    expect(root.querySelector('[data-testid="platform"]')?.textContent).toBe(
      'Running as: Installed PWA',
    );
  });

  it('treats the name as text, never as HTML', () => {
    renderApp(root, { name: '<img src=x onerror=alert(1)>', platform: 'browser', online: true });
    expect(root.querySelector('img')).toBeNull();
  });

  it('updates the network status', () => {
    const view = renderApp(root, { name: 'My App', platform: 'browser', online: true });
    const network = root.querySelector<HTMLElement>('[data-testid="network"]');
    expect(network?.dataset['state']).toBe('online');
    view.setOnline(false);
    expect(network?.dataset['state']).toBe('offline');
  });

  it('shows the update banner and reloads on click', () => {
    const view = renderApp(root, { name: 'My App', platform: 'browser', online: true });
    const banner = root.querySelector<HTMLElement>('[data-testid="update-banner"]');
    expect(banner?.hidden).toBe(true);

    const onReload = vi.fn();
    view.showUpdateBanner(onReload);
    expect(banner?.hidden).toBe(false);
    banner?.querySelector('button')?.click();
    expect(onReload).toHaveBeenCalledOnce();
  });
});
