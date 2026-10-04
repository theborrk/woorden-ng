import { expect, test } from '@playwright/test';
import { snap } from './support/review';

test('I18: AC1 profile choices survive an offline reload with stable identity', async ({
  page,
  context,
}) => {
  await page.goto('./#/settings');
  await page.getByLabel('New profile name').fill('Profile A');
  await page.getByRole('button', { name: 'Create profile', exact: true }).click();
  await expect(
    page.getByLabel('Local profile', { exact: true }).locator('option:checked'),
  ).toHaveText('Profile A');
  const profileId = await page.getByLabel('Local profile', { exact: true }).inputValue();
  await page.getByLabel('Learning language').selectOption('pl');
  await page.getByLabel('Time zone').fill('Europe/Warsaw');
  await page.getByLabel('Study day starts at').fill('05:30');
  await page.getByLabel('New concepts per day').fill('0');
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.getByText('Saved on this installation.', { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel('Local profile', { exact: true })).toHaveValue(profileId);
  await expect(page.getByLabel('Learning language')).toHaveValue('pl');
  await expect(page.getByLabel('Time zone')).toHaveValue('Europe/Warsaw');
  await expect(page.getByLabel('Study day starts at')).toHaveValue('05:30');
  await expect(page.getByLabel('New concepts per day')).toHaveValue('0');
  await snap(page, 'profile offline persisted');
});

test('I14: AC2 EN interface and PL learning language remain independent', async ({ page }) => {
  await page.goto('./#/settings');
  await page.getByLabel('Learning language').selectOption('pl');
  await page.getByLabel('Interface language').selectOption('pl');
  await expect(page.getByLabel('Język nauki')).toHaveValue('pl');
  await page.getByLabel('Język interfejsu').selectOption('en');
  await expect(page.getByLabel('Interface language')).toHaveValue('en');
  await expect(page.getByLabel('Learning language')).toHaveValue('pl');
  await page.reload();
  await expect(page.getByLabel('Learning language')).toHaveValue('pl');
  await snap(page, 'independent profile languages');
});

test('I22: AC3 switching profiles retains each configuration and explains separate installations', async ({
  page,
}) => {
  await page.goto('./#/settings');
  const first = await page.getByLabel('Local profile', { exact: true }).inputValue();
  await page.getByLabel('Learning language').selectOption('pl');
  await page.getByLabel('New profile name').fill('Profile B');
  await page.getByRole('button', { name: 'Create profile', exact: true }).click();
  await expect(page.getByLabel('Learning language')).toHaveValue('en');
  const second = await page.getByLabel('Local profile', { exact: true }).inputValue();
  expect(second).not.toBe(first);
  await page.getByLabel('Local profile', { exact: true }).selectOption(first);
  await expect(page.getByLabel('Learning language')).toHaveValue('pl');
  await page.getByLabel('Local profile', { exact: true }).selectOption(second);
  await expect(page.getByLabel('Learning language')).toHaveValue('en');
  await expect(
    page.getByText(/Another browser or Android installation has separate data/),
  ).toBeVisible();
  await snap(page, 'local profile isolation');
});

test('I18: AC4 validation and rejected IndexedDB writes retain edits for retry', async ({
  page,
}) => {
  await page.goto('./#/settings');
  await page.getByLabel('Time zone').fill('Invalid/Zone');
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.getByRole('alert')).toContainText('Your edits are retained');
  await expect(page.getByLabel('Time zone')).toHaveValue('Invalid/Zone');
  await page.getByLabel('Time zone').fill('Europe/Amsterdam');
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/unbound-method -- capture the prototype method to invoke later with its original receiver.
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof original>) {
      if (this.name === 'preferences') {
        IDBObjectStore.prototype.put = original;
        throw new DOMException('Injected quota failure', 'QuotaExceededError');
      }
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not save');
  await expect(page.getByLabel('Time zone')).toHaveValue('Europe/Amsterdam');
  await expect(page.getByText('Saved on this installation.', { exact: true })).toHaveCount(0);
  await snap(page, 'profile unsaved retry');
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.getByText('Saved on this installation.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Time zone')).toHaveValue('Europe/Amsterdam');
  await snap(page, 'profile retry committed');
});

test('I22: T-127 AC4 separate PWA installations have distinct stores and explain manual transfer', async ({
  page,
  browser,
}) => {
  await page.goto('./#/settings');
  await expect(page.getByTestId('installation-id')).toBeVisible();
  const first = await page.getByTestId('installation-id').textContent();
  const isolated = await browser.newContext();
  try {
    const other = await isolated.newPage();
    await other.goto(new URL('./#/settings', page.url()).href);
    await expect(other.getByTestId('installation-id')).toBeVisible();
    expect(await other.getByTestId('installation-id').textContent()).not.toBe(first);
    await expect(
      other.getByText(
        /Another browser or Android installation has separate data; transfer requires a backup/,
      ),
    ).toBeVisible();
    await snap(other, 'separate-installation-identity');
  } finally {
    await isolated.close();
  }
  await snap(page, 'pwa-installation-identity');
});
