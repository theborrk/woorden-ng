import './styles.css';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { target } from '#target';
import { APP } from '../app.config';
import { App } from './app/App';
import { browserLanguage, createLocalization, languageKey } from './i18n';
import { detectPlatform } from './platform';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app root element');

let language = browserLanguage(navigator.languages);
let initialLanguageError = false;
try {
  const saved = window.sessionStorage.getItem(languageKey);
  if (saved === 'en' || saved === 'pl') language = saved;
} catch {
  initialLanguageError = true;
}

createRoot(root).render(
  createElement(
    I18nextProvider,
    { i18n: createLocalization(language) },
    createElement(App, {
      name: APP.name,
      platform: detectPlatform(target.name),
      updates: target,
      initialLanguageError,
    }),
  ),
);
