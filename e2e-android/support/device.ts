import {
  _android as android,
  expect,
  test as base,
  type AndroidDevice,
  type AndroidWebView,
  type Page,
} from '@playwright/test';
import { connect } from 'node:net';
import capacitorConfig from '../../capacitor.config';
import { reviewScreenshotPath } from '../../e2e/support/review';

/**
 * Device tests drive the real Android app (the debug APK) through its WebView: Playwright talks to
 * the emulator or phone over adb and attaches to the WebView like Chrome DevTools does. Debug builds
 * allow that; release builds do not. CI installs the APK before the tests run
 * (scripts/device-tests.sh). Debug builds use the `.dev` application id suffix
 * (android/app/build.gradle), so they install next to the release app.
 */
export const PACKAGE = process.env.ANDROID_PACKAGE ?? `${capacitorConfig.appId}.dev`;

/** Origin the Capacitor WebView serves the app from (https://localhost unless configured). */
const APP_ORIGIN = `${capacitorConfig.server?.androidScheme ?? 'https'}://${capacitorConfig.server?.hostname ?? 'localhost'}`;

const ADB_PORT = 5037;

/** Playwright reports a missing adb server as a bare ECONNREFUSED, so check for it first. */
async function adbServerRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port: ADB_PORT });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

async function pidOf(device: AndroidDevice): Promise<number | undefined> {
  const output = (await device.shell(`pidof ${PACKAGE}`)).toString().trim();
  const pid = Number.parseInt(output.split(/\s+/)[0] ?? '', 10);
  return Number.isNaN(pid) ? undefined : pid;
}

async function waitForPid(device: AndroidDevice): Promise<number> {
  const found: { pid: number | undefined } = { pid: undefined };
  await expect
    .poll(async () => (found.pid = await pidOf(device)), {
      message: `${PACKAGE} did not start`,
      timeout: 30_000,
    })
    .toBeDefined();
  if (found.pid === undefined) throw new Error(`${PACKAGE} did not start`);
  return found.pid;
}

/**
 * (Re)starts the app and returns a Playwright page attached to its WebView.
 * `clearData: true` wipes the app's storage first (like a fresh install); `false` keeps it (like the
 * user swiping the app away and opening it again).
 */
export async function launchApp(
  device: AndroidDevice,
  { clearData }: { clearData: boolean },
): Promise<Page> {
  await device.shell(`am force-stop ${PACKAGE}`);
  if (clearData) await device.shell(`pm clear ${PACKAGE}`);
  await device.shell(`monkey -p ${PACKAGE} -c android.intent.category.LAUNCHER 1`);
  const pid = await waitForPid(device);
  // Attach to the WebView of the new process, never a stale one from before the restart.
  const isCurrent = (view: AndroidWebView) => view.pid() === pid;
  const webView =
    device.webViews().find(isCurrent) ??
    (await device.waitForEvent('webview', { predicate: isCurrent, timeout: 60_000 }));
  const page = await webView.page();
  // The WebView exists before the app is loaded into it; wait for the app's load event.
  await page.waitForURL((url) => url.origin === APP_ORIGIN, { timeout: 60_000 });
  return page;
}

/** Saves a screenshot of the whole device screen (system bars included) for review. */
export async function snapDevice(device: AndroidDevice, name: string): Promise<void> {
  await device.screenshot({ path: await reviewScreenshotPath(name) });
}

type DeviceFixtures = { app: Page };
type DeviceWorkerFixtures = { device: AndroidDevice };

export const test = base.extend<DeviceFixtures, DeviceWorkerFixtures>({
  device: [
    // eslint-disable-next-line no-empty-pattern -- Playwright fixtures must destructure their first argument
    async ({}, use) => {
      if (!(await adbServerRunning())) {
        throw new Error(
          `No adb server on port ${ADB_PORT}. Device tests need adb with an emulator or phone ` +
            'attached; without an Android SDK, leave them to the "Android device tests" CI job.',
        );
      }
      const devices = await android.devices({ omitDriverInstall: true });
      const serial = process.env.ANDROID_SERIAL;
      const device = devices.find((d) => d.serial() === serial) ?? devices[0];
      if (!device) {
        throw new Error(
          'No Android device found: start an emulator or connect a phone (adb devices).',
        );
      }
      const installed = (await device.shell(`pm path ${PACKAGE}`)).toString();
      if (!installed.includes('package:')) {
        throw new Error(
          `${PACKAGE} is not installed: install the debug APK first (scripts/device-tests.sh does).`,
        );
      }
      await use(device);
      await device.close();
    },
    { scope: 'worker' },
  ],
  // Every test starts with a freshly launched app and empty storage.
  app: async ({ device }, use) => {
    await use(await launchApp(device, { clearData: true }));
    await device.shell(`am force-stop ${PACKAGE}`);
  },
});

export { expect };
