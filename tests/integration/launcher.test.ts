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
      Buffer.from(command.startsWith('cat ') ? (snapshots.shift() ?? '') : ''),
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
