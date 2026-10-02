import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Platform } from '../platform';
import type { TargetServices } from '../targets/types';
import { languageKey } from '../i18n';
import { routeFromHash, routes } from './routes';

export interface AppProps {
  name: string;
  platform: Platform;
  updates: Pick<TargetServices, 'registerUpdates'>;
  storage?: Pick<TargetServices, 'initialize'>;
  initialLanguageError?: boolean;
}

export function App({ name, platform, updates, storage, initialLanguageError = false }: AppProps) {
  const { t, i18n } = useTranslation();
  const [route, setRoute] = useState(() => routeFromHash(window.location.hash));
  const [online, setOnline] = useState(navigator.onLine);
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null);
  const [languageError, setLanguageError] = useState(initialLanguageError);
  const [storageError, setStorageError] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(routeFromHash(window.location.hash));
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    // Connectivity can change between the first render and effect subscription.
    setOnline(navigator.onLine);
    if (!routes.some((item) => window.location.hash === `#/${item}`)) {
      window.history.replaceState(null, '', '#/today');
    }
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    updates.registerUpdates((activate) => {
      if (mounted) setApplyUpdate(() => activate);
    });
    return () => {
      mounted = false;
    };
  }, [updates]);

  useEffect(() => {
    if (!storage) return;
    let mounted = true;
    void storage.initialize().catch(() => {
      if (mounted) setStorageError(true);
    });
    return () => {
      mounted = false;
    };
  }, [storage]);

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? 'en';
  }, [i18n.resolvedLanguage]);

  useEffect(() => {
    heading.current?.focus();
  }, [route]);

  return (
    <div className="shell">
      <header className="shell__header">
        <h1>{name}</h1>
      </header>
      <section className="shell__status" aria-label={t('status')}>
        <p data-testid="platform">
          {t('runningAs')} <strong>{t(platform)}</strong>
        </p>
        <p data-testid="network" role="status" data-state={online ? 'online' : 'offline'}>
          {t(online ? 'online' : 'offline')}
        </p>
      </section>
      {storageError && (
        <p role="alert" data-testid="storage-error">
          {t('storageError')}
        </p>
      )}
      {applyUpdate && (
        <div className="update-banner" data-testid="update-banner" role="alert">
          <span>{t('update')}</span>
          <button type="button" onClick={applyUpdate}>
            {t('reload')}
          </button>
        </div>
      )}
      <nav aria-label={t('navigation')}>
        {routes.map((item) => (
          <a key={item} href={`#/${item}`} aria-current={route === item ? 'page' : undefined}>
            {t(item)}
          </a>
        ))}
      </nav>
      <main aria-labelledby="screen-title">
        <h2 id="screen-title" tabIndex={-1} ref={heading}>
          {t(route)}
        </h2>
        <p>{t('placeholder')}</p>
        {route === 'settings' && (
          <>
            <label htmlFor="interface-language">{t('language')}</label>
            <select
              id="interface-language"
              value={i18n.resolvedLanguage}
              onChange={(event) => {
                const language = event.target.value === 'pl' ? 'pl' : 'en';
                void i18n.changeLanguage(language);
                try {
                  window.sessionStorage.setItem(languageKey, language);
                  setLanguageError(false);
                } catch {
                  setLanguageError(true);
                }
              }}
            >
              <option value="en" lang="en">
                English
              </option>
              <option value="pl" lang="pl">
                Polski
              </option>
            </select>
            <p>{t('session')}</p>
          </>
        )}
        {languageError && <p role="alert">{t('languageError')}</p>}
      </main>
    </div>
  );
}
