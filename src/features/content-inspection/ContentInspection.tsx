import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import drafts from '../../../content/inspection/starter-s01-s10.json';

export function ContentInspection() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(drafts.entries[0]?.id);
  const entry = drafts.entries.find((candidate) => candidate.id === selected);
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
      <article data-testid="inspection-entry" data-entry-id={entry.id}>
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
          </section>
        ))}
        <h5>{t('inspectionIPA')}</h5>
        {entry.lexeme.pronunciation.ipa.length === 0 ? (
          <p data-testid="inspection-ipa-missing">{t('inspectionIPAMissing')}</p>
        ) : (
          <ul data-testid="inspection-ipa">
            {entry.lexeme.pronunciation.ipa.map((ipa, i) => (
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
          <p>{entry.content_sha256}</p>
        </details>
      </article>
    </section>
  );
}
