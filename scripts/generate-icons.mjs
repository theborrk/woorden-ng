import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { drawOriginalIcon } from './original-icon.mjs';

export const iconOutputs = [
  ['public/favicon.png', 32, 'original'],
  ['public/apple-touch-icon-180x180.png', 180, 'original'],
  ['public/pwa-192x192.png', 192, 'original'],
  ['public/pwa-512x512.png', 512, 'original'],
  ['public/maskable-icon-512x512.png', 512, 'maskable'],
  ...[
    ['mdpi', 48, 108],
    ['hdpi', 72, 162],
    ['xhdpi', 96, 216],
    ['xxhdpi', 144, 324],
    ['xxxhdpi', 192, 432],
  ].flatMap(([density, size, foreground]) => {
    const dir = `android/app/src/main/res/mipmap-${density}`;
    return [
      [`${dir}/ic_launcher.png`, size, 'maskable'],
      [`${dir}/ic_launcher_round.png`, size, 'maskable'],
      [`${dir}/ic_launcher_foreground.png`, foreground, 'adaptive'],
    ];
  }),
];

export async function generateIcons(root = resolve(import.meta.dirname, '..')) {
  const npmChromium = resolve(import.meta.dirname, '../.cache/npm-chromium/chromium');
  const executablePath = existsSync(chromium.executablePath())
    ? undefined
    : existsSync(npmChromium)
      ? npmChromium
      : process.env.PW_CHROMIUM_PATH;
  const browser = await chromium.launch({ executablePath });
  try {
    const page = await browser.newPage();
    for (const [file, size, variant] of iconOutputs) {
      const data = await page.evaluate(
        `(${drawOriginalIcon.toString()})(${JSON.stringify({ size, variant })})`,
      );
      const destination = resolve(root, file);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, Buffer.from(data.split(',')[1], 'base64'));
    }
    const background = resolve(root, 'android/app/src/main/res/values/ic_launcher_background.xml');
    await mkdir(dirname(background), { recursive: true });
    await writeFile(
      background,
      '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#15397A</color>\n</resources>\n',
    );
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateIcons();
}
