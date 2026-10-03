import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { build } from 'vite';
import type * as StudyDaySpike from '../tests/fixtures/time-browser';
import {
  boundaryFixtures,
  disambiguationFixtures,
  reviewFixtures,
} from '../tests/fixtures/study-day';
import { snap } from './support/review';

type SpikeWindow = typeof globalThis & {
  StudyDaySpike: typeof StudyDaySpike;
  Temporal?: typeof StudyDaySpike.Temporal;
};

let bundle: string;

test.beforeAll(async () => {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: true,
      lib: {
        entry: fileURLToPath(new URL('../tests/fixtures/time-browser.ts', import.meta.url)),
        name: 'StudyDaySpike',
        formats: ['iife'],
      },
    },
  });
  const output = Array.isArray(result) ? result[0] : result;
  if (!output || !('output' in output)) throw new Error('Expected one in-memory spike bundle');
  const chunk = output.output.find((output) => output.type === 'chunk');
  if (!chunk) throw new Error('Spike bundle has no JavaScript chunk');
  bundle = chunk.code;
});

for (const runtime of ['browser', 'polyfill'] as const) {
  test(`T21: study-day fixtures pass in Chromium with ${runtime} Temporal`, async ({ page }) => {
    await page.goto('./');
    if (runtime === 'polyfill') {
      await page.evaluate(() =>
        Object.defineProperty(globalThis, 'Temporal', { value: undefined, configurable: true }),
      );
    }
    await page.addScriptTag({ content: bundle });
    const result = await page.evaluate(
      ({ reviews, boundaries, disambiguations }) => {
        const host = globalThis as SpikeWindow;
        const spike = host.StudyDaySpike;
        const zone = 'Europe/Amsterdam';
        return {
          nativeAvailable: host.Temporal !== undefined,
          usesNative: spike.Temporal === host.Temporal,
          reviews: reviews.map((fixture) => ({
            studyDate: spike.studyDate(fixture.instant, zone, '06:00'),
            ...spike.oneStudyDayEligibility(fixture.instant, zone, '06:00'),
          })),
          boundaries: boundaries.map((fixture) =>
            spike.studyDayBoundary(fixture.date, zone, fixture.boundary),
          ),
          disambiguations: disambiguations.map((fixture) =>
            spike.studyDate(fixture.instant, zone, '02:30'),
          ),
        };
      },
      {
        reviews: reviewFixtures,
        boundaries: boundaryFixtures,
        disambiguations: disambiguationFixtures,
      },
    );
    expect(result.usesNative).toBe(result.nativeAvailable);
    if (runtime === 'polyfill') expect(result.nativeAvailable).toBe(false);
    expect(result.reviews).toEqual(
      reviewFixtures.map((fixture) => ({
        studyDate: fixture.studyDate,
        dueStudyDate: fixture.dueStudyDate,
        eligibleAt: fixture.eligibleAt,
        projectedInTimeZone: 'Europe/Amsterdam',
      })),
    );
    expect(result.boundaries).toEqual(boundaryFixtures.map((fixture) => fixture.start));
    expect(result.disambiguations).toEqual(disambiguationFixtures.map((fixture) => fixture.date));
    await snap(page, `time ${runtime}`);
  });
}
