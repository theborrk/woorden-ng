import { setupServiceWorker } from '../sw';
import { webAppInfo } from '../platform/web/app-info';
import type { TargetServices } from './types';

/** Web (PWA) target: service-worker updates with a user prompt. */
export const target: TargetServices = {
  name: 'web',
  appInfo: webAppInfo,
  initialize: () => Promise.resolve(),
  registerUpdates: setupServiceWorker,
};
