export type RecoveryReason = 'missing' | 'open' | 'newer' | 'migration';
export interface RecoveryState {
  reason: RecoveryReason;
  exportSupported: boolean;
}
export interface StorageRecovery {
  state(): RecoveryState | undefined;
  exportProfiles(): Promise<string>;
}
