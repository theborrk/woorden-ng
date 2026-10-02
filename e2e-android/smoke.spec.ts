import type { Page } from '@playwright/test';
import { APP } from '../app.config';
import { expect, launchApp, snapDevice, test } from './support/device';

test('starts as an Android app and renders the app shell', async ({ app, device }) => {
  await expect(app.getByRole('heading', { level: 1 })).toHaveText(APP.name);
  await expect(app.getByTestId('platform')).toHaveText('Running as: Android app');
  await snapDevice(device, 'home');
});

test('never registers a service worker in the native app', async ({ app }) => {
  await expect(app.getByRole('heading', { level: 1 })).toHaveText(APP.name);
  const registrations = await app.evaluate(async () =>
    'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0,
  );
  expect(registrations).toBe(0);
});

// Harness self-test: launchApp() can restart the app with or without its data, which is what
// persistence tests rely on. The marker is written with a strict-durability IndexedDB transaction,
// so it is on disk before the app process is killed.
async function writeMarker(page: Page, value: string): Promise<void> {
  await page.evaluate(
    (marker) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('device-test', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('kv');
        request.onerror = () => reject(new Error(String(request.error)));
        request.onsuccess = () => {
          const tx = request.result.transaction('kv', 'readwrite', { durability: 'strict' });
          tx.objectStore('kv').put(marker, 'marker');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(new Error(String(tx.error)));
        };
      }),
    value,
  );
}

async function readMarker(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      new Promise<string | null>((resolve, reject) => {
        const request = indexedDB.open('device-test', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('kv');
        request.onerror = () => reject(new Error(String(request.error)));
        request.onsuccess = () => {
          const get = request.result.transaction('kv').objectStore('kv').get('marker');
          get.onsuccess = () => resolve(typeof get.result === 'string' ? get.result : null);
          get.onerror = () => reject(new Error(String(get.error)));
        };
      }),
  );
}

test('keeps app data across a restart and loses it on a data wipe', async ({ app, device }) => {
  await writeMarker(app, 'kept');

  const restarted = await launchApp(device, { clearData: false });
  expect(await readMarker(restarted)).toBe('kept');

  const wiped = await launchApp(device, { clearData: true });
  expect(await readMarker(wiped)).toBeNull();
});
