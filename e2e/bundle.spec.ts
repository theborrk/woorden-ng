import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

async function javascriptBytes(directory: string): Promise<number> {
  const entries = await readdir(directory, { withFileTypes: true });
  const sizes = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return javascriptBytes(path);
      return entry.name.endsWith('.js') ? gzipSync(await readFile(path)).byteLength : 0;
    }),
  );
  return sizes.reduce((sum, size) => sum + size, 0);
}

test('W04: production web JavaScript including service-worker assets stays under 150 kB gzip', async () => {
  expect(await javascriptBytes('dist/web')).toBeLessThan(150_000);
});

test('W47: the production web bundle contains no App plugin or Android AppInfo adapter', async () => {
  const assets = 'dist/web/assets';
  const maps = (await readdir(assets)).filter((name) => name.endsWith('.js.map'));
  expect(maps.length).toBeGreaterThan(0);
  const sources = (
    await Promise.all(
      maps.map(async (name) => {
        const map = JSON.parse(await readFile(join(assets, name), 'utf8')) as { sources: string[] };
        return map.sources;
      }),
    )
  ).flat();
  expect(sources.some((source) => source.includes('src/platform/web/app-info.ts'))).toBe(true);
  expect(sources.some((source) => source.includes('@capacitor/app/'))).toBe(false);
  expect(sources.some((source) => source.includes('src/platform/android/app-info.ts'))).toBe(false);
});
