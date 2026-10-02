import { expect, test } from '@playwright/test';
import { APP } from '../app.config';
import { snap } from './support/review';

const screens = ['Today', 'Study', 'Library', 'Progress', 'Settings'];

test('W04: phone shell navigates to every screen with its own hash', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(APP.name);
  for (const title of screens) {
    const link = page.getByRole('link', { name: title, exact: true });
    await expect(link).toBeVisible();
    const bounds = await link.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`#/${title.toLowerCase()}$`));
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(title);
    await expect(link).toHaveAttribute('aria-current', 'page');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await snap(page, `shell ${title.toLowerCase()}`);
  }
});

test('F06: switches English to Polish without reloading and retains it for the tab session', async ({
  page,
}) => {
  await page.goto('./#/settings');
  await page.evaluate(() => {
    document.body.dataset['samePage'] = 'yes';
  });
  await page.getByLabel('Interface language').selectOption('pl');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Ustawienia');
  for (const title of ['Dzisiaj', 'Nauka', 'Biblioteka', 'Postępy', 'Ustawienia']) {
    await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  }
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  await expect(page.locator('body')).toHaveAttribute('data-same-page', 'yes');
  await snap(page, 'settings Polish');
  await page.getByRole('link', { name: 'Nauka', exact: true }).click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Nauka');
  await page.reload();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Nauka');
  await snap(page, 'study Polish session');
});

test('W04: hash routes support direct links and browser back with keyboard navigation', async ({
  page,
}) => {
  await page.goto('./#/library');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Library');
  const study = page.getByRole('link', { name: 'Study', exact: true });
  await study.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Study');
  await expect(page.getByRole('heading', { level: 2 })).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Library');
  await snap(page, 'library keyboard back');
});

test('F06: browser Polish defaults to Polish with a dark phone layout', async ({ browser }) => {
  const context = await browser.newContext({
    locale: 'pl-PL',
    colorScheme: 'dark',
    viewport: { width: 360, height: 740 },
  });
  const page = await context.newPage();
  await page.goto('./#/settings');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Ustawienia');
  await expect(page.getByLabel('Język interfejsu')).toHaveValue('pl');
  await snap(page, 'settings Polish dark');
  await context.close();
});

test('F06: unsupported browser languages fall back to English', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'nl-NL' });
  const page = await context.newPage();
  await page.goto('./#/settings');
  await expect(page.getByLabel('Interface language')).toHaveValue('en');
  await snap(page, 'settings fallback English');
  await context.close();
});
