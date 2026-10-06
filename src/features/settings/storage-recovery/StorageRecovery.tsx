import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StorageRecovery } from '../../../application/ports/storage-recovery';

export function StorageRecoveryScreen({
  recovery,
  retry,
}: {
  recovery: StorageRecovery;
  retry: () => void;
}) {
  const { t } = useTranslation();
  const [exported, setExported] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const state = recovery.state();
  return (
    <section aria-label={t('recoveryTitle')}>
      <p role="alert" data-testid="storage-error">
        {t('storageError')}
      </p>
      <p>{t(state?.reason === 'newer' ? 'recoveryNewer' : 'recoveryPreserved')}</p>
      <button onClick={retry}>{t('retry')}</button>
      {state?.exportSupported && (
        <>
          <p>{t('recoveryExportNotice')}</p>
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setFailed(false);
              void recovery
                .exportProfiles()
                .then(setExported)
                .catch(() => setFailed(true))
                .finally(() => setBusy(false));
            }}
          >
            {t('recoveryExport')}
          </button>
        </>
      )}
      {failed && <p role="alert">{t('recoveryExportError')}</p>}
      {exported && (
        <label>
          {t('recoveryExport')}
          <textarea readOnly value={exported} rows={12} />
        </label>
      )}
    </section>
  );
}
