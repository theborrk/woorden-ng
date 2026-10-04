import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

export type Language = 'en' | 'pl';
export const languageKey = 'woorden-ng.interface-language';

const en = {
  profiles: 'Local profile',
  profileName: 'New profile name',
  createProfile: 'Create profile',
  preferences: 'Preferences',
  cueLanguage: 'Learning language',
  timeZone: 'Time zone',
  dayBoundary: 'Study day starts at',
  newBudget: 'New concepts per day',
  savePreferences: 'Save preferences',
  profileSaving: 'Saving or loading…',
  profileSaved: 'Saved on this installation.',
  profileUnsaved: 'Edit preferences, then save. Language choices save automatically.',
  profileError:
    'Could not save or open local data. Your edits are retained. Check the values and retry; reopen Settings to refresh a conflict.',
  retry: 'Retry',
  separateData:
    'Profiles stay on this installation. Another browser or Android installation has separate data; transfer requires a backup.',
  gentleDefaults:
    'Gentle configuration: {{activeAcquiringTasks}} active acquiring tasks and a {{sessionMinutes}} minute session target. Study features are still being prepared.',
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
  about: 'About',
  version: 'Version',
  build: 'Build',
  appInfoLoading: 'Loading app information…',
  appInfoError: 'App information is unavailable. Open Settings again to retry.',
  storageError: 'Native storage is unavailable. Data cannot be saved. Restart the app to retry.',
  languageError:
    'The language could not be saved for this session. You can still use it until you reload.',
};
const pl: typeof en = {
  profiles: 'Profil lokalny',
  profileName: 'Nazwa nowego profilu',
  createProfile: 'Utwórz profil',
  preferences: 'Preferencje',
  cueLanguage: 'Język nauki',
  timeZone: 'Strefa czasowa',
  dayBoundary: 'Początek dnia nauki',
  newBudget: 'Nowe pojęcia dziennie',
  savePreferences: 'Zapisz preferencje',
  profileSaving: 'Zapisywanie lub wczytywanie…',
  profileSaved: 'Zapisano w tej instalacji.',
  profileUnsaved: 'Zmień preferencje i zapisz. Wybór języka zapisuje się automatycznie.',
  profileError:
    'Nie można zapisać lub otworzyć danych lokalnych. Zmiany zachowano. Sprawdź wartości i spróbuj ponownie; otwórz Ustawienia ponownie, aby odświeżyć konflikt.',
  retry: 'Spróbuj ponownie',
  separateData:
    'Profile pozostają w tej instalacji. Inna przeglądarka lub aplikacja Android ma osobne dane; przeniesienie wymaga kopii zapasowej.',
  gentleDefaults:
    'Łagodna konfiguracja: {{activeAcquiringTasks}} aktywnych zadań i sesja docelowa {{sessionMinutes}} minut. Funkcje nauki są w przygotowaniu.',
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
  about: 'O aplikacji',
  version: 'Wersja',
  build: 'Kompilacja',
  appInfoLoading: 'Wczytywanie informacji o aplikacji…',
  appInfoError:
    'Informacje o aplikacji są niedostępne. Otwórz ponownie Ustawienia, aby spróbować jeszcze raz.',
  storageError:
    'Pamięć natywna jest niedostępna. Nie można zapisać danych. Uruchom aplikację ponownie, aby spróbować jeszcze raz.',
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
