import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import draftsUrl from '../../../content/inspection/starter-s01-s60.json?url';
import type draftsArtifact from '../../../content/inspection/starter-s01-s60.json';

type Drafts = typeof draftsArtifact;

export function ContentInspection() {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState<Drafts | null>(null);
  const [selected, setSelected] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    void fetch(draftsUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Inspection asset unavailable');
        const value: unknown = await response.json();
        if (
          !value ||
          typeof value !== 'object' ||
          !('schema_version' in value) ||
          value.schema_version !== 'woorden-starter-inspection-1' ||
          !('inspection_only' in value) ||
          value.inspection_only !== true ||
          !('entries' in value) ||
          !Array.isArray(value.entries) ||
          value.entries.length !== 60 ||
          !('shared_entities' in value)
        )
          throw new Error('Unsupported inspection artifact');
        // This is a bundled, generated inspection fixture, never a user content import.
        return value as Drafts;
      })
      .then((value) => {
        if (!controller.signal.aborted) setDrafts(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [retry]);
  if (failed)
    return (
      <div role="alert">
        <p>{t('inspectionUnavailable')}</p>
        <button onClick={() => setRetry((n) => n + 1)}>{t('retry')}</button>
      </div>
    );
  if (!drafts) return <p role="status">{t('inspectionLoading')}</p>;
  const entry = drafts.entries.find((candidate) => candidate.id === selected) ?? drafts.entries[0];
  if (!entry) return <p role="alert">{t('inspectionUnavailable')}</p>;
  return (
    <section className="content-inspection" aria-labelledby="inspection-title">
      <h3 id="inspection-title">{t('inspectionTitle')}</h3>
      <p>{t('inspectionNotice')}</p>
      <label htmlFor="inspection-sense">{t('inspectionSense')}</label>
      <select
        id="inspection-sense"
        value={entry.id}
        onChange={(event) => setSelected(event.target.value)}
      >
        {drafts.entries.map((sense) => (
          <option key={sense.id} value={sense.id}>
            {sense.fixture_ref} — {sense.lexeme.display}
          </option>
        ))}
      </select>
      <article
        data-testid="inspection-entry"
        data-entry-id={entry.id}
        data-lexeme-id={entry.lexeme.id}
      >
        <h4 lang="nl">
          {entry.fixture_ref} — {entry.lexeme.display}
        </h4>
        <p className="draft-label">{t('inspectionDraft')}</p>
        <p data-testid="inspection-review">{t('inspectionReview')}</p>
        <p>{t('inspectionSourcesNotice')}</p>
        <p>{t('inspectionAudioMissing')}</p>
        <h5>{t('inspectionDefinition')}</h5>
        <p lang="nl" data-testid="inspection-definition">
          {entry.sense.definition_nl}
        </p>
        {(['en', 'pl'] as const).map((locale) => (
          <div key={locale}>
            <h5>
              {locale.toUpperCase()} — {t('inspectionMeanings')}
            </h5>
            <ul lang={locale} data-testid={`inspection-meanings-${locale}`}>
              {entry.sense.meanings[locale].map((meaning, i) => (
                <li key={i}>{meaning}</li>
              ))}
            </ul>
          </div>
        ))}
        <h5>{t('inspectionExamples')}</h5>
        {entry.examples.map((example) => (
          <section
            key={example.id}
            data-testid="inspection-example"
            aria-label={t('inspectionExample')}
          >
            <p lang="nl">{example.nl}</p>
            <p lang="en">EN: {example.translations.en}</p>
            <p lang="pl">PL: {example.translations.pl}</p>
            <details>
              <summary>{t('inspectionAnswerContract')}</summary>
              <pre data-testid="inspection-answer-contract">
                {JSON.stringify(
                  {
                    target_sense_id: example.target_sense_id,
                    target_form_ids: example.target_form_ids,
                    answer_spans: example.answer_spans,
                    offset_unit: example.offset_unit,
                    accepted_answers: example.accepted_answers,
                    task_contract: example.task_contract,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          </section>
        ))}
        <h5>{t('inspectionIPA')}</h5>
        {entry.lexeme.pronunciation.ipa.length === 0 ? (
          <p data-testid="inspection-ipa-missing">{t('inspectionIPAMissing')}</p>
        ) : (
          <ul data-testid="inspection-ipa">
            {[...entry.lexeme.pronunciation.ipa].map((ipa, i) => (
              <li key={i}>
                <span lang="nl">{ipa.ipa}</span> · {ipa.source_ids.join(', ')}
              </li>
            ))}
          </ul>
        )}
        <details>
          <summary>{t('inspectionFacts')}</summary>
          <pre>
            {JSON.stringify(
              {
                morphology: entry.lexeme.morphology,
                forms: entry.forms,
                pronunciation: entry.lexeme.pronunciation,
              },
              null,
              2,
            )}
          </pre>
        </details>
        <details>
          <summary>{t('inspectionProvenance')}</summary>
          <dl data-testid="inspection-provenance">
            {Object.entries(entry.provenance).map(([pointer, provenance]) => (
              <div key={pointer}>
                <dt>
                  <code>{pointer}</code>
                </dt>
                <dd>
                  {t('inspectionClaim')}: <code>{provenance.status}</code> · {provenance.method} ·{' '}
                  {provenance.source_ids.join(', ') || t('inspectionNoSource')}
                </dd>
              </div>
            ))}
          </dl>
        </details>
        <details>
          <summary>{t('inspectionCitations')}</summary>
          <ul>
            {entry.sources.map((source) => (
              <li key={source.id}>
                <strong>{source.id}</strong> · {source.family} ·{' '}
                {source.url || t('inspectionNoSource')}
                <br />
                <code>{source.record_sha256}</code> · {source.retrieved_at}
              </li>
            ))}
          </ul>
        </details>
        <details>
          <summary>{t('inspectionIdentity')}</summary>
          <p>{entry.id}</p>
          <p data-testid="inspection-lexeme-id">{entry.lexeme.id}</p>
          <p>{entry.content_sha256}</p>
        </details>
        {drafts.shared_entities.lexemes.some((lexeme) => lexeme.id === entry.lexeme.id) && (
          <details>
            <summary>{t('inspectionSharedEvidence')}</summary>
            <pre data-testid="inspection-shared-evidence">
              {JSON.stringify(
                {
                  lexeme: drafts.shared_entities.lexemes.find(
                    (lexeme) => lexeme.id === entry.lexeme.id,
                  ),
                  forms: drafts.shared_entities.forms.filter(
                    (form) => form.lexeme_id === entry.lexeme.id,
                  ),
                },
                null,
                2,
              )}
            </pre>
          </details>
        )}
      </article>
    </section>
  );
}
