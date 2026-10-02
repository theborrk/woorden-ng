import { setupServiceWorker } from '../sw';
import type { TargetServices } from './types';

/** Web (PWA) target: service-worker updates with a user prompt. */
export const target: TargetServices = {
  name: 'web',
  initialize: () => Promise.resolve(),
  registerUpdates: setupServiceWorker,
};
