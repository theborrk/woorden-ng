import { expect, test } from '@playwright/test';
import slice from '../content/inspection/starter-s01-s10.json' with { type: 'json' };
import complete from '../content/inspection/starter-s01-s60.json' with { type: 'json' };
import { snap } from './support/review';

test('T43: AC1 all ten unreviewed starter senses expose locales, examples and research source states', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('./#/library');
  await expect(page.getByRole('heading', { name: 'Draft content inspection' })).toBeVisible();
  await expect(page.getByLabel('Draft sense').locator('option')).toHaveCount(60);
  for (const entry of slice.entries) {
    await page.getByLabel('Draft sense').selectOption(entry.id);
    const article = page.getByTestId('inspection-entry');
    await expect(article).toHaveAttribute('data-entry-id', entry.id);
    await expect(article.getByRole('heading', { level: 4 })).toHaveText(
      `${entry.fixture_ref} — ${entry.lexeme.display}`,
    );
    await expect(article.getByText('Unreviewed draft', { exact: true })).toBeVisible();
    await expect(page.getByTestId('inspection-review')).toHaveText(
      'Language check: not run. Structure: unchecked. Release: blocked.',
    );
    await expect(page.getByTestId('inspection-definition')).toHaveText(entry.sense.definition_nl);
    for (const locale of ['en', 'pl'] as const)
      await expect(page.getByTestId(`inspection-meanings-${locale}`).locator('li')).toHaveText(
        entry.sense.meanings[locale],
      );
    await expect(page.getByTestId('inspection-example')).toHaveCount(entry.examples.length);
    for (const [i, example] of entry.examples.entries()) {
      const view = page.getByTestId('inspection-example').nth(i);
      await expect(view.locator('[lang="nl"]')).toHaveText(example.nl);
      await expect(view.locator('[lang="en"]')).toHaveText(`EN: ${example.translations.en}`);
      await expect(view.locator('[lang="pl"]')).toHaveText(`PL: ${example.translations.pl}`);
    }
    const provenance = article
      .locator('details')
      .filter({ has: page.getByText('Field provenance — research assertions', { exact: true }) });
    await provenance.locator('summary').click();
    for (const [pointer, value] of Object.entries(entry.provenance)) {
      await expect(provenance.locator('dt').filter({ hasText: pointer }).first()).toBeVisible();
      await expect(provenance).toContainText(`Research status: ${value.status}`);
    }
    await provenance.locator('summary').click();
    const facts = article.locator('details').filter({
      has: page.getByText('Source facts and forms — research assertions', { exact: true }),
    });
    await facts.locator('summary').click();
    await expect(facts.locator('pre')).toHaveText(
      JSON.stringify(
        {
          morphology: entry.lexeme.morphology,
          forms: entry.forms,
          pronunciation: entry.lexeme.pronunciation,
        },
        null,
        2,
      ),
    );
    await facts.locator('summary').click();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await snap(page, 'starter draft inspection English');
});

for (const lemma of ['bank', 'alsjeblieft']) {
  test(`W20: AC2 ${lemma} sense switching changes meanings/examples while retaining canonical shared identity`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('./#/library');
    await expect(page.getByLabel('Draft sense').locator('option')).toHaveCount(60);
    const senses = complete.entries.filter((entry) => entry.lexeme.lemma === lemma);
    const canonical = complete.shared_entities.lexemes.find((entry) => entry.lemma === lemma);
    if (senses.length !== 2 || !canonical) throw new Error('Missing shared-sense fixture');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await context.setOffline(true);
    await page.reload();
    for (const sense of senses) {
      await page.getByLabel('Draft sense').selectOption(sense.id);
      await expect(page.getByTestId('inspection-entry')).toHaveAttribute('data-entry-id', sense.id);
      await expect(page.getByTestId('inspection-entry')).toHaveAttribute(
        'data-lexeme-id',
        canonical.id,
      );
      await expect(page.getByTestId('inspection-definition')).toHaveText(sense.sense.definition_nl);
      for (const locale of ['en', 'pl'] as const)
        await expect(page.getByTestId(`inspection-meanings-${locale}`).locator('li')).toHaveText(
          sense.sense.meanings[locale],
        );
      await expect(page.getByTestId('inspection-example').locator('[lang="nl"]')).toHaveText(
        sense.examples.map((e) => e.nl),
      );
      const shared = page
        .getByTestId('inspection-entry')
        .locator('details')
        .filter({
          has: page.getByText('Shared lexeme and form evidence — research assertions', {
            exact: true,
          }),
        });
      await shared.locator('summary').click();
      await expect(page.getByTestId('inspection-shared-evidence')).toHaveText(
        JSON.stringify(
          {
            lexeme: canonical,
            forms: complete.shared_entities.forms.filter((form) => form.lexeme_id === canonical.id),
          },
          null,
          2,
        ),
      );
      await shared.locator('summary').click();
      await expect(page.getByTestId('inspection-review')).toContainText('Release: blocked');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await snap(page, `${lemma} shared senses offline`);
  });
}

test('T43: AC2 missing whole-expression IPA stays unavailable offline in the Polish inspection view', async ({
  page,
  context,
}) => {
  await page.goto('./#/settings');
  await page.getByLabel('Interface language').selectOption('pl');
  await page.getByRole('link', { name: 'Biblioteka', exact: true }).click();
  const expression = slice.entries.find((e) => e.fixture_ref === 'S08');
  if (!expression) throw new Error('Missing S08 inspection fixture');
  await page.getByLabel('Znaczenie robocze').selectOption(expression.id);
  await expect(page.getByTestId('inspection-ipa-missing')).toHaveText(
    'IPA całego wyrażenia jest niedostępne. Nie wygenerowano zapisu fonetycznego.',
  );
  await expect(page.getByTestId('inspection-ipa')).toHaveCount(0);
  await expect(page.getByText('Niesprawdzony szkic', { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByLabel('Znaczenie robocze').selectOption(expression.id);
  await expect(page.getByTestId('inspection-ipa-missing')).toBeVisible();
  await expect(page.getByTestId('inspection-ipa')).toHaveCount(0);
  await snap(page, 'starter missing IPA Polish offline');
});
