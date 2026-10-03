import { APP } from '../app.config';
import { expect, PACKAGE, snapDevice, test } from './support/device';

test('AC2: debug APK launcher shows the husky on Delft blue', async ({ app, device }) => {
  await expect(app.getByRole('heading', { level: 1 })).toHaveText(APP.name);
  const { bounds, screenshot } =
    await test.step('capture the installed icon in the launcher app list', async () => {
      await device.shell('input keyevent KEYCODE_HOME');
      const size = (await device.shell('wm size')).toString().match(/Physical size: (\d+)x(\d+)/);
      if (!size) throw new Error('Cannot determine launcher dimensions');
      const width = Number(size[1]),
        height = Number(size[2]);
      // The shared fixture omits Playwright's native driver; shell input/UI dumps need no driver.
      await device.shell(
        `input swipe ${width / 2} ${Math.round(height * 0.85)} ${width / 2} ${Math.round(height * 0.2)} 250`,
      );
      const label = APP.name
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
      let tile: string | undefined;
      await expect
        .poll(
          async () => {
            await device.shell('uiautomator dump /sdcard/woorden-launcher.xml');
            const xml = (await device.shell('cat /sdcard/woorden-launcher.xml')).toString();
            tile = xml
              .match(/<node\b[^>]*>/g)
              ?.find(
                (node) =>
                  node.includes(`text="${label}"`) && /package="[^"]*launcher[^"]*"/.test(node),
              );
            return tile !== undefined;
          },
          {
            timeout: 20_000,
            message: 'Installed Woorden tile is visible in the launcher app list',
          },
        )
        .toBe(true);
      const coordinates = tile?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
      if (!coordinates) throw new Error('Launcher tile has no screenshot bounds');
      const x = Number(coordinates[1]),
        y = Number(coordinates[2]);
      const bounds = {
        x,
        y,
        width: Number(coordinates[3]) - x,
        height: Number(coordinates[4]) - y,
      };
      const screenshot = (await device.screenshot()).toString('base64');
      await snapDevice(device, 'husky launcher app list');
      return { bounds, screenshot };
    });
  // Image.decode() needs rendering frames, which a background Android WebView suspends.
  // Capture the real launcher first, then resume the app solely to inspect that saved image.
  const colors = await test.step('inspect launcher pixels in the resumed WebView', async () => {
    await device.shell(`monkey -p ${PACKAGE} -c android.intent.category.LAUNCHER 1`);
    return app.evaluate(
      async ({ screenshot, bounds }) => {
        const image = new Image();
        image.src = `data:image/png;base64,${screenshot}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);
        const data = ctx.getImageData(bounds.x, bounds.y, bounds.width, bounds.height).data;
        const colors = [
          [21, 57, 122],
          [246, 248, 251],
          [83, 170, 233],
          [231, 110, 56],
        ];
        return colors.map((color) => {
          let count = 0;
          for (let i = 0; i < data.length; i += 4) {
            if (color.every((value, j) => Math.abs((data[i + j] ?? -255) - value) < 12)) count++;
          }
          return count > 5;
        });
      },
      { screenshot, bounds },
    );
  });
  expect(
    colors,
    'Launcher tile must contain Delft blue, white face, blue eyes and orange tongue',
  ).toEqual([true, true, true, true]);
});
