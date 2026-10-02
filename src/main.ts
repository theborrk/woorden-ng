import './styles.css';
import { target } from '#target';
import { APP } from '../app.config';
import { renderApp } from './app';
import { detectPlatform } from './platform';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app root element');

const platform = detectPlatform(target.name);
const view = renderApp(root, { name: APP.name, platform, online: navigator.onLine });

window.addEventListener('online', () => view.setOnline(true));
window.addEventListener('offline', () => view.setOnline(false));

target.registerUpdates((applyUpdate) => view.showUpdateBanner(applyUpdate));
