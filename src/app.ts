import { PLATFORM_LABELS, type Platform } from './platform';

export interface AppState {
  name: string;
  platform: Platform;
  online: boolean;
}

export interface AppView {
  setOnline(online: boolean): void;
  showUpdateBanner(onReload: () => void): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Renders the app shell. Uses DOM APIs (never innerHTML with data) to stay XSS-safe. */
export function renderApp(root: HTMLElement, state: AppState): AppView {
  root.replaceChildren();

  const main = el('main', { class: 'shell' });
  const header = el('header', { class: 'shell__header' });
  header.append(el('h1', {}, state.name));

  const status = el('section', { class: 'shell__status', 'aria-label': 'Status' });
  const platform = el('p', { 'data-testid': 'platform' }, 'Running as: ');
  platform.append(el('strong', {}, PLATFORM_LABELS[state.platform]));
  const network = el('p', { 'data-testid': 'network', role: 'status' });
  status.append(platform, network);

  const banner = el('div', {
    class: 'update-banner',
    'data-testid': 'update-banner',
    role: 'alert',
  });
  banner.hidden = true;

  main.append(header, status, banner);
  root.append(main);

  const view: AppView = {
    setOnline(online) {
      network.textContent = online ? 'Online' : 'Offline - showing cached app';
      network.dataset['state'] = online ? 'online' : 'offline';
    },
    showUpdateBanner(onReload) {
      banner.replaceChildren(el('span', {}, 'A new version is available.'));
      const button = el('button', { type: 'button' }, 'Reload');
      button.addEventListener('click', onReload);
      banner.append(button);
      banner.hidden = false;
    },
  };
  view.setOnline(state.online);
  return view;
}
