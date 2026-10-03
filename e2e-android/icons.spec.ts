import { APP } from '../app.config';
import { expect, snapDevice, test } from './support/device';

test('AC2: debug APK launcher shows the husky on Delft blue', async ({ app, device }) => {
  await expect(app.getByRole('heading', { level: 1 })).toHaveText(APP.name);
  await device.shell('input keyevent KEYCODE_HOME');
  const size = (await device.shell('wm size')).toString().match(/Physical size: (\d+)x(\d+)/);
  if (!size) throw new Error('Cannot determine launcher dimensions');
  const width = Number(size[1]),
    height = Number(size[2]);
  await device.input.swipe(
    { x: width / 2, y: height * 0.85 },
    [{ x: width / 2, y: height * 0.2 }],
    50,
  );
  const selector = { text: APP.name, pkg: /.*launcher.*/ };
  await device.wait(selector);
  const { bounds } = await device.info(selector);
  // Inspect the real launcher's icon tile, not the WebView's copy of an asset.
  await expect
    .poll(
      async () => {
        const screenshot = (await device.screenshot()).toString('base64');
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
                if (color.every((value, j) => Math.abs((data[i + j] ?? -255) - value) < 12))
                  count++;
              }
              return count > 5;
            });
          },
          { screenshot, bounds },
        );
      },
      { message: 'Launcher tile must contain Delft blue, white face, blue eyes and orange tongue' },
    )
    .toEqual([true, true, true, true]);
  await snapDevice(device, 'husky launcher app list');
});
