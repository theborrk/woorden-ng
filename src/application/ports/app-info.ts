export interface AppInfoValue {
  readonly version: string;
  /** Git commit on web; installed APK version code on Android. */
  readonly build: string;
}

export interface AppInfo {
  getInfo(): Promise<AppInfoValue>;
}
