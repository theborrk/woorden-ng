import { expect, test } from '@playwright/test';
import { snap } from './support/review';

test('AC1: manifest husky icons preserve the drawing and fit the maskable safe circle', async ({
  page,
  request,
}) => {
  await page.goto('./');
  const response = await request.get('manifest.webmanifest');
  const manifest = (await response.json()) as {
    icons: { src: string; sizes: string; purpose?: string }[];
  };
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: 'pwa-192x192.png', sizes: '192x192' }),
      expect.objectContaining({ src: 'pwa-512x512.png', sizes: '512x512' }),
      expect.objectContaining({
        src: 'maskable-icon-512x512.png',
        sizes: '512x512',
        purpose: 'maskable',
      }),
    ]),
  );
  for (const icon of manifest.icons) {
    const pixels = await page.evaluate(async (icon) => {
      const image = new Image();
      image.src = new URL(icon.src, document.baseURI).href;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = image.width;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, image.width, image.height).data;
      let outside = 0;
      let white = 0;
      let iris = 0;
      let tongue = 0;
      for (let y = 0; y < image.height; y++)
        for (let x = 0; x < image.width; x++) {
          const offset = (y * image.width + x) * 4;
          const r = data[offset],
            g = data[offset + 1],
            b = data[offset + 2];
          if (r === 246 && g === 248 && b === 251) white++;
          if (r === 83 && g === 170 && b === 233) iris++;
          if (r === 231 && g === 110 && b === 56) tongue++;
          if (
            Math.hypot(x + 0.5 - image.width / 2, y + 0.5 - image.height / 2) > image.width * 0.4 &&
            (r !== 21 || g !== 57 || b !== 122 || data[offset + 3] !== 255)
          )
            outside++;
        }
      // Review images come from the actual built manifest URLs.
      image.alt = icon.src;
      document.body.append(image);
      return { width: image.width, white, iris, tongue, outside };
    }, icon);
    expect(`${pixels.width}x${pixels.width}`).toBe(icon.sizes);
    expect(pixels.white).toBeGreaterThan(pixels.width ** 2 * 0.05);
    expect(pixels.iris).toBeGreaterThan(50);
    expect(pixels.tongue).toBeGreaterThan(10);
    if (icon.purpose === 'maskable') expect(pixels.outside).toBe(0);
  }
  await snap(page, 'original husky icons');
});
