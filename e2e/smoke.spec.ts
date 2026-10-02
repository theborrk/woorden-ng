import { expect, test } from '@playwright/test';
import { APP } from '../app.config';
import { snap } from './support/review';

test('app shell renders in a mobile browser', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle(APP.name);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(APP.name);
  await expect(page.getByTestId('platform')).toHaveText('Running as: Browser');
  await expect(page.getByTestId('network')).toHaveText('Online');
  await snap(page, 'home');
});

test('keeps working offline after the first visit', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // The first load installs the service worker; the reload is the first page it controls.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(APP.name);
  await expect(page.getByTestId('network')).toHaveText(/Offline/);
  await snap(page, 'home offline');
});

test('serves an installable web app manifest', async ({ request }) => {
  const response = await request.get('manifest.webmanifest');
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    name: string;
    display: string;
    icons: { sizes: string; purpose?: string }[];
  };
  expect(manifest.name).toBe(APP.name);
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
  expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
});
