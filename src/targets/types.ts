/**
 * What each build target provides to the app. src/main.ts imports the active target through the
 * `#target` alias (vite.config.ts), so web-only code never ships in the Android bundle and the
 * other way round. Add platform adapters (storage, files, audio, lifecycle) here as the app grows.
 */
export type TargetName = 'web' | 'android';

export interface TargetServices {
  readonly name: TargetName;
  /** Opens target storage; rejects visibly if native storage is unavailable. */
  initialize(): Promise<void>;
  /** Starts update checks; calls `onUpdateReady` with a function that applies the update. */
  registerUpdates(onUpdateReady: (applyUpdate: () => void) => void): void;
}
