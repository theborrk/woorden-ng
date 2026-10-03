import { expect, PACKAGE, snapDevice, test } from './support/device';

test('W47: Settings About shows the installed APK native version name and version code', async ({
  app,
  device,
}) => {
  // PackageManager is independent of the plugin and includes debug suffixes and CI version codes.
  const installed = (await device.shell(`dumpsys package ${PACKAGE}`)).toString();
  const version = installed.match(/^\s*versionName=(.+)$/m)?.[1]?.trim();
  const build = installed.match(/^\s*versionCode=(\d+)\b/m)?.[1];
  expect(version, 'Installed APK versionName').toBeTruthy();
  expect(build, 'Installed APK versionCode').toBeTruthy();
  if (!version || !build) throw new Error('Installed APK metadata is missing');
  await app.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(app.getByRole('region', { name: 'About', exact: true })).toBeVisible();
  await expect(app.getByTestId('app-version')).toHaveText(version);
  await expect(app.getByTestId('app-build')).toHaveText(build);
  await snapDevice(device, 'settings native about');
});
