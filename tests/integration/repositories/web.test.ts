// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { storageCases } from './storage-cases.ts';
import { createWebDriver } from './web-driver.ts';

describe('Dexie web storage contract', () => {
  for (const scenario of storageCases) {
    it(scenario.name, async () => {
      const driver = createWebDriver();
      try {
        for (const step of scenario.steps) {
          if ('error' in step) {
            await expect(driver.execute(step.command)).rejects.toMatchObject(step.error);
          } else {
            await expect(driver.execute(step.command)).resolves.toStrictEqual(step.expected);
          }
        }
      } finally {
        await driver.dispose();
      }
    });
  }
});
