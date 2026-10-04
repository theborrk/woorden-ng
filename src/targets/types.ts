/**
 * What each build target provides to the app. src/main.ts imports the active target through the
 * `#target` alias (vite.config.ts), so web-only code never ships in the Android bundle and the
 * other way round. Add platform adapters (storage, files, audio, lifecycle) here as the app grows.
 */
import type { ProfileService } from '../application/profiles/service';
import type { AppInfo } from '../application/ports/app-info';

export type TargetName = 'web' | 'android';

export interface TargetServices {
  readonly name: TargetName;
  readonly appInfo: AppInfo;
  readonly profiles?: ProfileService;
  /** Opens target storage; rejects visibly if native storage is unavailable. */
  initialize(): Promise<void>;
  /** Starts update checks; calls `onUpdateReady` with a function that applies the update. */
  registerUpdates(onUpdateReady: (applyUpdate: () => void) => void): void;
}
