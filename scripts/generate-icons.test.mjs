// @vitest-environment node
import { existsSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { generateIcons, iconOutputs } from './generate-icons.mjs';

test('AC3: two generator runs are identical and every committed launcher/PWA icon is current', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'woorden-icons-'));
  const files = [
    ...iconOutputs.map(([file]) => file),
    'android/app/src/main/res/values/ic_launcher_background.xml',
  ];
  try {
    await generateIcons(root);
    const first = await Promise.all(files.map((file) => readFile(resolve(root, file))));
    await generateIcons(root);
    for (const [index, file] of files.entries()) {
      expect(await readFile(resolve(root, file)), file).toEqual(first[index]);
      expect(await readFile(file), `${file} must be regenerated`).toEqual(first[index]);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);

test('AC1/AC2: the rendered husky exactly preserves legacy makeIcon shapes and colors', async () => {
  const legacy = await readFile('legacy/index.html', 'utf8');
  const drawing = legacy.slice(
    legacy.indexOf('function makeIcon(){'),
    legacy.indexOf('    const url=c.toDataURL'),
  );
  const roundRect = legacy.slice(
    legacy.indexOf('function roundRect(ctx,'),
    legacy.indexOf('/* ============ тренировка'),
  );
  const browser = await chromium.launch({
    executablePath: existsSync(chromium.executablePath())
      ? undefined
      : resolve('.cache/npm-chromium/chromium'),
  });
  try {
    const page = await browser.newPage();
    const expected = await page.evaluate(
      `(() => { ${roundRect} ${drawing} return c.toDataURL('image/png'); } catch (error) { throw error; } } return makeIcon(); })()`,
    );
    expect(Buffer.from(expected.split(',')[1], 'base64')).toEqual(
      await readFile('public/apple-touch-icon-180x180.png'),
    );
  } finally {
    await browser.close();
  }
}, 30_000);
