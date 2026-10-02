import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

export type Language = 'en' | 'pl';
export const languageKey = 'woorden-ng.interface-language';

const en = {
  today: 'Today',
  study: 'Study',
  library: 'Library',
  progress: 'Progress',
  settings: 'Settings',
  navigation: 'Main navigation',
  status: 'Status',
  runningAs: 'Running as:',
  browser: 'Browser',
  pwa: 'Installed PWA',
  android: 'Android app',
  online: 'Online',
  offline: 'Offline - showing cached app',
  update: 'A new version is available.',
  reload: 'Reload',
  placeholder: 'This screen is being prepared. Learning features will arrive in a future update.',
  language: 'Interface language',
  session: 'Your language choice applies to this tab session.',
  languageError:
    'The language could not be saved for this session. You can still use it until you reload.',
};
const pl: typeof en = {
  today: 'Dzisiaj',
  study: 'Nauka',
  library: 'Biblioteka',
  progress: 'Postępy',
  settings: 'Ustawienia',
  navigation: 'Nawigacja główna',
  status: 'Status',
  runningAs: 'Uruchomiono jako:',
  browser: 'Przeglądarka',
  pwa: 'Zainstalowana aplikacja PWA',
  android: 'Aplikacja Android',
  online: 'Online',
  offline: 'Offline - wyświetlana jest zapisana aplikacja',
  update: 'Dostępna jest nowa wersja.',
  reload: 'Odśwież',
  placeholder:
    'Ten ekran jest w przygotowaniu. Funkcje nauki pojawią się w przyszłej aktualizacji.',
  language: 'Język interfejsu',
  session: 'Wybrany język obowiązuje w tej sesji karty.',
  languageError:
    'Nie udało się zapisać języka na czas tej sesji. Możesz go używać do odświeżenia strony.',
};

export function browserLanguage(languages: readonly string[]): Language {
  for (const language of languages) {
    const primary = language.toLowerCase().split('-')[0];
    if (primary === 'en' || primary === 'pl') return primary;
  }
  return 'en';
}

export function createLocalization(language: Language) {
  const i18n = createInstance();
  // Bundled resources initialize synchronously, including offline and native startup.
  void i18n.use(initReactI18next).init({
    lng: language,
    fallbackLng: 'en',
    supportedLngs: ['en', 'pl'],
    resources: { en: { translation: en }, pl: { translation: pl } },
    initAsync: false,
    interpolation: { escapeValue: false },
  });
  return i18n;
}
