import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

export type Language = 'en' | 'pl';
export const languageKey = 'woorden-ng.interface-language';

const en = {
  inspectionTitle: 'Draft content inspection',
  inspectionNotice:
    'Ten research drafts for inspection only. They are not eligible for study or curated publication.',
  inspectionSense: 'Draft sense',
  inspectionDraft: 'Unreviewed draft',
  inspectionReview: 'Language check: not run. Structure: unchecked. Release: blocked.',
  inspectionSourcesNotice:
    'Source states below are research assertions. Production source evidence has not been validated for this slice; a source claim is not language approval.',
  inspectionAudioMissing: 'Approved audio unavailable. Listening tasks are unavailable.',
  inspectionDefinition: 'Dutch definition',
  inspectionMeanings: 'Meanings',
  inspectionExamples: 'Examples',
  inspectionExample: 'Draft example',
  inspectionIPA: 'Source IPA',
  inspectionIPAMissing: 'Whole-expression IPA unavailable. No generated phonetics.',
  inspectionFacts: 'Source facts and forms — research assertions',
  inspectionProvenance: 'Field provenance — research assertions',
  inspectionCitations: 'Source citations',
  inspectionClaim: 'Research status',
  inspectionNoSource: 'No source recorded',
  inspectionIdentity: 'Identity and original payload hash',
  inspectionUnavailable: 'Draft content is unavailable.',
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
  inspectionTitle: 'Przegląd treści roboczych',
  inspectionNotice:
    'Dziesięć szkiców badawczych tylko do przeglądu. Nie kwalifikują się do nauki ani publikacji w zatwierdzonym pakiecie.',
  inspectionSense: 'Znaczenie robocze',
  inspectionDraft: 'Niesprawdzony szkic',
  inspectionReview:
    'Kontrola językowa: nie przeprowadzono. Struktura: niesprawdzona. Publikacja: zablokowana.',
  inspectionSourcesNotice:
    'Poniższe stany źródeł pochodzą z badań. Dowody źródłowe dla tej części nie zostały zweryfikowane do użytku w aplikacji; powołanie się na źródło nie jest zatwierdzeniem językowym.',
  inspectionAudioMissing: 'Zatwierdzone nagranie niedostępne. Zadania ze słuchu są niedostępne.',
  inspectionDefinition: 'Definicja niderlandzka',
  inspectionMeanings: 'Znaczenia',
  inspectionExamples: 'Przykłady',
  inspectionExample: 'Przykład roboczy',
  inspectionIPA: 'IPA ze źródła',
  inspectionIPAMissing:
    'IPA całego wyrażenia jest niedostępne. Nie wygenerowano zapisu fonetycznego.',
  inspectionFacts: 'Fakty źródłowe i formy — deklaracje z badań',
  inspectionProvenance: 'Pochodzenie pól — deklaracje z badań',
  inspectionCitations: 'Cytowane źródła',
  inspectionClaim: 'Status z badań',
  inspectionNoSource: 'Nie zapisano źródła',
  inspectionIdentity: 'Tożsamość i skrót oryginalnej treści',
  inspectionUnavailable: 'Treść robocza jest niedostępna.',
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
