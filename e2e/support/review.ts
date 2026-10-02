import { mkdir } from 'node:fs/promises';
import { test, type Page } from '@playwright/test';

/**
 * Where a review screenshot for the current test goes: <dir>/<project>--<name>.png.
 * CI publishes the web ones on the PR preview at /__review/ and attaches them to the review.
 */
export async function reviewScreenshotPath(name: string): Promise<string> {
  const dir = process.env.REVIEW_SCREENSHOTS_DIR ?? 'review-screenshots';
  await mkdir(dir, { recursive: true });
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${dir}/${test.info().project.name}--${slug}.png`;
}

/**
 * Saves a full-page screenshot for human and Claude review.
 * Call it at the end of every user-facing acceptance test with a short, descriptive name.
 */
export async function snap(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: await reviewScreenshotPath(name), fullPage: true });
}
