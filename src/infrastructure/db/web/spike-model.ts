// Logical spike rows only; these are not the W06 production repository contracts.
export type SpikeEvent = {
  id: string;
  occurredAt: number;
  payloadJson: string;
} & ({ kind: 'attempt'; commitKey: string } | { kind: 'exposure' | 'help'; commitKey?: never });

export interface SpikeProgress {
  profileId: string;
  taskId: string;
  revision: number;
  eligibleAt: number;
  projectionVersion: number;
  stateJson: string;
}

export interface SpikeProjectionMeta {
  id: string;
  appliedEventId: string;
  projectionVersion: number;
}
