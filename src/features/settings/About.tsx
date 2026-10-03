import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppInfo, AppInfoValue } from '../../application/ports/app-info';

type InfoState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; value: AppInfoValue };

export function About({ appInfo }: { appInfo: AppInfo }) {
  const { t } = useTranslation();
  const [info, setInfo] = useState<InfoState>({ status: 'loading' });

  useEffect(() => {
    let mounted = true;
    setInfo({ status: 'loading' });
    void appInfo.getInfo().then(
      (value) => {
        if (mounted) setInfo({ status: 'ready', value });
      },
      () => {
        if (mounted) setInfo({ status: 'error' });
      },
    );
    return () => {
      mounted = false;
    };
  }, [appInfo]);

  return (
    <section aria-labelledby="about-title">
      <h3 id="about-title">{t('about')}</h3>
      {info.status === 'loading' && <p role="status">{t('appInfoLoading')}</p>}
      {info.status === 'error' && <p role="alert">{t('appInfoError')}</p>}
      {info.status === 'ready' && (
        <dl>
          <dt>{t('version')}</dt>
          <dd data-testid="app-version">{info.value.version}</dd>
          <dt>{t('build')}</dt>
          <dd data-testid="app-build">{info.value.build}</dd>
        </dl>
      )}
    </section>
  );
}
