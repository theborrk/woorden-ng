import { expect, launchApp, snapDevice, test } from './support/device';
import type { Page } from '@playwright/test';
import type { ProfileFailure } from '../src/infrastructure/db/android/profile-debug';

async function settings(page: Page) {
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Local profile', { exact: true })).toBeVisible();
}
async function prepare(page: Page, mode: ProfileFailure) {
  await expect.poll(() => page.evaluate(() => window.__nativeProfiles !== undefined)).toBe(true);
  expect(await page.evaluate(() => window.Capacitor?.DEBUG)).toBe(true);
  return page.evaluate((mode) => window.__nativeProfiles!.prepare(mode), mode);
}

test('I22: AC1/AC4 native profiles retain isolated preferences and installation identity after restart', async ({
  app,
  device,
}) => {
  await settings(app);
  const first = await app.getByLabel('Local profile', { exact: true }).inputValue();
  const identity = await app.getByTestId('installation-id').textContent();
  await app.getByLabel('Learning language').selectOption('pl');
  await expect(app.getByText('Saved on this installation.', { exact: true })).toBeVisible();
  await app.getByLabel('New profile name').fill('Profile B');
  await app.getByRole('button', { name: 'Create profile', exact: true }).click();
  await expect(app.getByLabel('Learning language')).toHaveValue('en');
  const second = await app.getByLabel('Local profile', { exact: true }).inputValue();
  expect(second).not.toBe(first);
  await app.getByLabel('New concepts per day').fill('0');
  await app.getByRole('button', { name: 'Save preferences' }).click();
  await expect(app.getByText('Saved on this installation.', { exact: true })).toBeVisible();
  const restarted = await launchApp(device, { clearData: false });
  await settings(restarted);
  await expect(restarted.getByLabel('Local profile', { exact: true })).toHaveValue(second);
  await expect(restarted.getByLabel('New concepts per day')).toHaveValue('0');
  await expect(restarted.getByTestId('installation-id')).toHaveText(identity!);
  await restarted.getByLabel('Local profile', { exact: true }).selectOption(first);
  await expect(restarted.getByLabel('Learning language')).toHaveValue('pl');
  await expect(restarted.getByLabel('New concepts per day')).toHaveValue('2');
  await expect(
    restarted.getByText(/Another browser or Android installation has separate data/),
  ).toBeVisible();
  expect(
    await restarted.evaluate(async () =>
      (await indexedDB.databases()).some((database) => database.name === 'woorden-ng'),
    ),
  ).toBe(false);
  await snapDevice(device, 'native-profile-isolation');
});
for (const mode of ['missing', 'open', 'newer'] as const) {
  test(`I20: AC2 ${mode} native support shows recovery and preserves data without fallback`, async ({
    app,
    device,
  }) => {
    const original = await prepare(app, mode);
    await app.reload();
    await expect(app.getByTestId('storage-error')).toBeVisible();
    await expect(app.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
    await expect(app.getByRole('button', { name: 'Export local profiles' })).toHaveCount(0);
    await expect(app.getByLabel('Local profile', { exact: true })).toHaveCount(0);
    await app.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(app.getByTestId('storage-error')).toBeVisible();
    const restarted = await launchApp(device, { clearData: false });
    await expect(restarted.getByTestId('storage-error')).toBeVisible();
    if (mode !== 'newer') {
      await restarted.evaluate(() =>
        localStorage.setItem('woorden-ng.debug-profile-fixture', 'older'),
      );
      await restarted.reload();
      await settings(restarted);
      await expect(restarted.getByLabel('Learning language')).toHaveValue('pl');
      await expect(restarted.getByTestId('installation-id')).toHaveText(
        original.installation.deviceId,
      );
    } else {
      await expect(restarted.getByText(/needs a newer app/)).toBeVisible();
      expect(await restarted.evaluate(() => window.__nativeProfiles!.fixtureRows())).toEqual({
        version: 99,
        profiles: original.profiles,
      });
    }
    await snapDevice(device, `native-recovery-${mode}`);
  });
}

test('T63: AC3 failed migration preserves the older populated schema and supports read-only export', async ({
  app,
  device,
}) => {
  const original = await prepare(app, 'migration');
  await app.reload();
  await expect(app.getByTestId('storage-error')).toBeVisible();
  await app.getByRole('button', { name: 'Export local profiles' }).click();
  const exported = app.getByRole('textbox', { name: 'Export local profiles' });
  await expect(exported).toBeVisible();
  const before: unknown = JSON.parse(await exported.inputValue());
  expect(before).toEqual({
    kind: 'local-profile-recovery',
    nativeSchemaVersion: 1,
    profiles: original.profiles,
    preferences: [original.preferences],
    installation: [original.installation],
  });
  const restarted = await launchApp(device, { clearData: false });
  await expect(restarted.getByTestId('storage-error')).toBeVisible();
  await restarted.getByRole('button', { name: 'Export local profiles' }).click();
  const recovered = restarted.getByRole('textbox', { name: 'Export local profiles' });
  await expect(recovered).toBeVisible();
  expect(JSON.parse(await recovered.inputValue())).toEqual(before);
  await snapDevice(device, 'native-profile-migration-rollback');
});

test('T63: AC3 process death after migration writes leaves a complete recoverable version', async ({
  app,
  device,
}) => {
  const original = await prepare(app, 'interrupted');
  await app.reload();
  await expect.poll(() => app.evaluate(() => window.__nativeProfiles?.migrationPaused)).toBe(true);
  // Fail the next upgrade too, so its read-only export proves the killed upgrade did not commit.
  await app.evaluate(() => localStorage.setItem('woorden-ng.debug-profile-fixture', 'migration'));
  const restarted = await launchApp(device, { clearData: false });
  await expect(restarted.getByTestId('storage-error')).toBeVisible();
  await restarted.getByRole('button', { name: 'Export local profiles' }).click();
  const recovered = restarted.getByRole('textbox', { name: 'Export local profiles' });
  await expect(recovered).toBeVisible();
  expect(JSON.parse(await recovered.inputValue())).toEqual({
    kind: 'local-profile-recovery',
    nativeSchemaVersion: 1,
    profiles: original.profiles,
    preferences: [original.preferences],
    installation: [original.installation],
  });
  await restarted.evaluate(() => localStorage.setItem('woorden-ng.debug-profile-fixture', 'older'));
  await restarted.reload();
  await settings(restarted);
  await expect(restarted.getByTestId('installation-id')).toHaveText(original.installation.deviceId);
  await expect(restarted.getByLabel('Learning language')).toHaveValue('pl');
  await snapDevice(device, 'native-profile-migration-process-death');
});
