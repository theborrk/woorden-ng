import { expect, test } from 'vitest';
import { findOrScrollLauncherTile, launcherTileBounds } from '../../e2e-android/support/launcher';

const textTile = '<node text="Woorden" package="com.android.launcher3" bounds="[12,30][92,150]"/>';

test('T-008: launcher navigation advances through HOME and drawer pages until the installed icon is visible', async () => {
  const snapshots = [
    '<node package="com.android.launcher3" text="Home"/>',
    '<node package="com.android.launcher3" text="Calendar"/>',
    '<node text="" content-desc="Woorden" package="com.android.launcher3" bounds="[12,30][92,150]"/>',
  ];
  const commands: string[] = [];
  const shell = (command: string): Promise<Buffer> => {
    commands.push(command);
    return Promise.resolve(
      Buffer.from(
        command.startsWith('cat ') ? `<hierarchy>${snapshots.shift() ?? ''}</hierarchy>` : '',
      ),
    );
  };
  expect(
    await findOrScrollLauncherTile(shell, 'Woorden', { width: 1080, height: 2400 }),
  ).toBeUndefined();
  expect(
    await findOrScrollLauncherTile(shell, 'Woorden', { width: 1080, height: 2400 }),
  ).toBeUndefined();
  expect(await findOrScrollLauncherTile(shell, 'Woorden', { width: 1080, height: 2400 })).toEqual({
    x: 12,
    y: 30,
    width: 80,
    height: 120,
  });
  expect(commands.filter((command) => command.startsWith('input swipe '))).toEqual([
    'input swipe 540 2040 540 480 250',
    'input swipe 540 2040 540 480 250',
  ]);
});

test('T-008: launcher lookup keeps the actual tile bounds and excludes app content and other labels', () => {
  expect(launcherTileBounds(textTile, 'Woorden')).toEqual({ x: 12, y: 30, width: 80, height: 120 });
  expect(
    launcherTileBounds(
      textTile.replace('com.android.launcher3', 'nl.theborrk.woorden.dev'),
      'Woorden',
    ),
  ).toBeUndefined();
  expect(
    launcherTileBounds(textTile.replace('text="Woorden"', 'text="Woorden settings"'), 'Woorden'),
  ).toBeUndefined();
  expect(launcherTileBounds(textTile.replace('[92,150]', '[12,30]'), 'Woorden')).toBeUndefined();
  expect(
    launcherTileBounds(
      textTile.replace('Woorden', 'Words &amp; &quot;ears&quot;'),
      'Words & "ears"',
    ),
  ).toEqual({ x: 12, y: 30, width: 80, height: 120 });
});

test('T-008: a failed UI dump reports the shell error instead of polling an absent hierarchy', async () => {
  const shell = (command: string): Promise<Buffer> =>
    Promise.resolve(
      Buffer.from(command.startsWith('cat ') ? 'No such file' : 'ERROR: could not get idle state.'),
    );
  await expect(
    findOrScrollLauncherTile(shell, 'Woorden', { width: 1080, height: 2400 }),
  ).rejects.toThrow('Launcher UI dump failed: ERROR: could not get idle state. No such file');
});

// UI nodes recorded in the failing API 36 CI run; no app/user data is included.
const systemUiDialog = `<node package="android" text="System UI isn't responding" bounds="[133,1064][947,1135]"/>
  <node package="android" text="Close app" bounds="[70,1174][1010,1300]"/>
  <node package="android" text="Wait" bounds="[70,1300][1010,1426]"/>`;

test('T-008: the recorded System UI ANR is recovered with Wait before verifying the launcher tile', async () => {
  let waiting = true;
  const inputs: string[] = [];
  const shell = (command: string): Promise<Buffer> => {
    if (command.startsWith('input ')) {
      inputs.push(command);
      if (command === 'input tap 540 1363') waiting = false;
    }
    return Promise.resolve(
      Buffer.from(
        command.startsWith('cat ')
          ? `<hierarchy>${waiting ? systemUiDialog : textTile}</hierarchy>`
          : '',
      ),
    );
  };
  expect(
    await findOrScrollLauncherTile(shell, 'Woorden', { width: 1080, height: 2400 }),
  ).toBeUndefined();
  expect(inputs).toEqual(['input tap 540 1363']);
  expect(await findOrScrollLauncherTile(shell, 'Woorden', { width: 1080, height: 2400 })).toEqual({
    x: 12,
    y: 30,
    width: 80,
    height: 120,
  });
  expect(inputs).toEqual(['input tap 540 1363']);
});

test('T-008: ANRs belonging to the app under test are never dismissed by launcher recovery', async () => {
  const inputs: string[] = [];
  const shell = (command: string): Promise<Buffer> => {
    if (command.startsWith('input ')) inputs.push(command);
    return Promise.resolve(
      Buffer.from(
        command.startsWith('cat ')
          ? `<hierarchy>${systemUiDialog.replace("System UI isn't responding", "Woorden isn't responding")}</hierarchy>`
          : '',
      ),
    );
  };
  expect(
    await findOrScrollLauncherTile(shell, 'Woorden', { width: 1080, height: 2400 }),
  ).toBeUndefined();
  expect(inputs.some((command) => command.startsWith('input tap '))).toBe(false);
});
