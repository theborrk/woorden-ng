import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Preferences } from '../../../application/ports/learning-unit-of-work';
import type { ProfileService, ProfileSnapshot } from '../../../application/profiles/service';
import { workloadDefaults } from '../../../application/profiles/service';

export function Profiles({ service, visible }: { service: ProfileService; visible: boolean }) {
  const { t, i18n } = useTranslation();
  const [snapshot, setSnapshot] = useState<ProfileSnapshot>();
  const [draft, setDraft] = useState<Preferences>();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const accept = async (value: ProfileSnapshot) => {
    setSnapshot(value);
    setDraft(value.preferences);
    await i18n.changeLanguage(value.preferences.interfaceLocale);
  };
  useEffect(() => {
    let mounted = true;
    void service
      .load(
        i18n.resolvedLanguage === 'pl' ? 'pl' : 'en',
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      )
      .then(async (value) => {
        if (mounted) await accept(value);
      })
      .catch(() => {
        if (mounted) setError(true);
      })
      .finally(() => {
        if (mounted) setBusy(false);
      });
    return () => {
      mounted = false;
    };
    // The service owns durable startup language; changing language must not reload preferences.
  }, [service]);
  const run = async (action: () => Promise<ProfileSnapshot>) => {
    setBusy(true);
    setError(false);
    setSaved(false);
    try {
      await accept(await action());
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const edit = (patch: Partial<Preferences>, autosave = false) => {
    if (!draft) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    setSaved(false);
    if (autosave) void run(() => service.save(next));
  };
  if (!visible) return error ? <p role="alert">{t('profileError')}</p> : null;
  return (
    <section>
      <p>{t('separateData')}</p>
      {snapshot && (
        <p>
          {t('installationId')}:{' '}
          <code data-testid="installation-id">{snapshot.installation.deviceId}</code>
        </p>
      )}
      {error && <p role="alert">{t('profileError')}</p>}
      <p role="status">{t(busy ? 'profileSaving' : saved ? 'profileSaved' : 'profileUnsaved')}</p>
      {!draft ? (
        <button
          disabled={busy}
          onClick={() =>
            void run(() =>
              service.load(
                i18n.resolvedLanguage === 'pl' ? 'pl' : 'en',
                Intl.DateTimeFormat().resolvedOptions().timeZone,
              ),
            )
          }
        >
          {t('retry')}
        </button>
      ) : (
        <>
          <label htmlFor="local-profile">{t('profiles')}</label>
          <select
            id="local-profile"
            disabled={busy}
            value={draft.profileId}
            onChange={(event) => void run(() => service.select(event.target.value))}
          >
            {snapshot?.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
          <label htmlFor="profile-name">{t('profileName')}</label>
          <input
            id="profile-name"
            value={name}
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
          />
          <button
            disabled={busy || !name.trim()}
            onClick={() =>
              void run(() => service.create(name, draft.interfaceLocale, draft.timeZone))
            }
          >
            {t('createProfile')}
          </button>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(() => service.save(draft));
            }}
          >
            <fieldset disabled={busy}>
              <legend>{t('preferences')}</legend>
              <label htmlFor="interface-language">{t('language')}</label>
              <select
                id="interface-language"
                value={draft.interfaceLocale}
                onChange={(event) =>
                  edit({ interfaceLocale: event.target.value === 'pl' ? 'pl' : 'en' }, true)
                }
              >
                <option value="en">English</option>
                <option value="pl">Polski</option>
              </select>
              <label htmlFor="cue-language">{t('cueLanguage')}</label>
              <select
                id="cue-language"
                value={draft.cueLocale}
                onChange={(event) =>
                  edit({ cueLocale: event.target.value === 'pl' ? 'pl' : 'en' }, true)
                }
              >
                <option value="en">English</option>
                <option value="pl">Polski</option>
              </select>
              <label htmlFor="time-zone">{t('timeZone')}</label>
              <input
                id="time-zone"
                required
                value={draft.timeZone}
                onChange={(event) => edit({ timeZone: event.target.value })}
              />
              <label htmlFor="day-boundary">{t('dayBoundary')}</label>
              <input
                id="day-boundary"
                type="time"
                required
                value={`${String(Math.floor(draft.studyDayBoundaryMinutes / 60)).padStart(2, '0')}:${String(draft.studyDayBoundaryMinutes % 60).padStart(2, '0')}`}
                onChange={(event) => {
                  const [hours, minutes] = event.target.value.split(':').map(Number);
                  edit({ studyDayBoundaryMinutes: (hours ?? 0) * 60 + (minutes ?? 0) });
                }}
              />
              <label htmlFor="new-budget">{t('newBudget')}</label>
              <input
                id="new-budget"
                type="number"
                min="0"
                required
                value={draft.dailyNewConceptBudget}
                onChange={(event) => edit({ dailyNewConceptBudget: Number(event.target.value) })}
              />
              <p>{t('gentleDefaults', workloadDefaults)}</p>
              <button type="submit">{t('savePreferences')}</button>
            </fieldset>
          </form>
        </>
      )}
    </section>
  );
}
