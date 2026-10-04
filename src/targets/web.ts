import { ProfileDatabase } from '../infrastructure/db/web/profiles';
import { createProfileService } from '../application/profiles/service';
import { setupServiceWorker } from '../sw';
import { webAppInfo } from '../platform/web/app-info';
import type { TargetServices } from './types';

/** Web (PWA) target: service-worker updates with a user prompt. */
export const target: TargetServices = {
  name: 'web',
  appInfo: webAppInfo,
  profiles: createProfileService(
    new ProfileDatabase(),
    () => crypto.randomUUID(),
    () => Date.now(),
  ),
  initialize: () => Promise.resolve(),
  registerUpdates: setupServiceWorker,
};
