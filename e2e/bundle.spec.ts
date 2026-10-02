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
