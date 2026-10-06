export function validateEntry(
  entry: unknown,
  evidence?: unknown,
): { valid: boolean; errors: string[] };
export function payloadHash(entry: unknown): string;
export const registry: Record<string, string>;
