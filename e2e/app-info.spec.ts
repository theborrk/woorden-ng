import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { snap } from './support/review';

test('W04: Settings About shows the web build version and commit', async ({ page }) => {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
  const commit = execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  await page.goto('./');
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('region', { name: 'About', exact: true })).toBeVisible();
  await expect(page.getByTestId('app-version')).toHaveText(version);
  await expect(page.getByTestId('app-build')).toHaveText(commit);
  await snap(page, 'settings web about');
});
