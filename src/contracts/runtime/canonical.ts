import { validateRecord } from './records.ts';
import type { RuntimeRecord } from './records.ts';

function encode(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(encode).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, child]) => `${JSON.stringify(key)}:${encode(child)}`)
      .join(',')}}`;
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error('Non-JSON value');
  return encoded;
}

/** Sorted UTF-16 keys, JSON number/string escaping, preserved Unicode, UTF-8, no trailing newline. */
export function canonicalRecord(input: unknown): {
  record: RuntimeRecord;
  canonical: string;
  bytes: Uint8Array;
} {
  const record = validateRecord(input);
  const canonical = encode(record);
  return { record, canonical, bytes: new TextEncoder().encode(canonical) };
}
