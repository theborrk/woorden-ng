/** Small strict boundary validators: no coercion, defaults, or unknown-field erasure. */
export class FieldError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = 'FieldError';
    this.field = field;
  }
}
export type Schema<T> = (value: unknown, field: string) => T;
export type Infer<S> = S extends Schema<infer T> ? T : never;

export function check(field: string, condition: boolean, message: string): asserts condition {
  if (!condition) throw new FieldError(field, message);
}
export const text: Schema<string> = (v, p) => {
  check(p, typeof v === 'string' && v.length > 0, 'expected nonempty text');
  check(p, v.isWellFormed(), 'expected well-formed Unicode');
  return v;
};
export const id: Schema<string> = (v, p) => {
  const s = text(v, p);
  check(
    p,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(s),
    'expected opaque UUID',
  );
  return s;
};
export const number: Schema<number> = (v, p) => {
  check(p, typeof v === 'number' && Number.isFinite(v), 'expected finite number');
  return v;
};
export function bounded(
  min: number,
  max = Number.MAX_SAFE_INTEGER,
  integer = true,
): Schema<number> {
  return (v, p) => {
    const n = number(v, p);
    check(
      p,
      n >= min && n <= max && (!integer || Number.isSafeInteger(n)),
      'number outside supported range',
    );
    return n;
  };
}
export const count = bounded(0);
export const positive = bounded(1);
export const instant = bounded(-8_640_000_000_000_000, 8_640_000_000_000_000);
export const boolean: Schema<boolean> = (v, p) => {
  check(p, typeof v === 'boolean', 'expected boolean');
  return v;
};
export function enumeration<const T extends readonly (string | number | boolean)[]>(
  ...values: T
): Schema<T[number]> {
  return (v, p) => {
    const match = values.find((x) => x === v);
    check(p, match !== undefined, `expected one of ${values.join(', ')}`);
    return match;
  };
}
export function optional<T>(schema: Schema<T>): Schema<T | undefined> {
  return (v, p) => (v === undefined ? undefined : schema(v, p));
}
export function nullable<T>(schema: Schema<T>): Schema<T | null> {
  return (v, p) => (v === null ? null : schema(v, p));
}
export function array<T>(schema: Schema<T>): Schema<T[]> {
  return (v, p) => {
    check(p, Array.isArray(v), 'expected array');
    return v.map((item: unknown, i) => schema(item, `${p}/${i}`));
  };
}
export function object<S extends Record<string, Schema<unknown>>>(
  shape: S,
): Schema<{ [K in keyof S]: Infer<S[K]> }> {
  return (v, p) => {
    check(
      p,
      typeof v === 'object' &&
        v !== null &&
        !Array.isArray(v) &&
        (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null),
      'expected plain object',
    );
    const input = v as Record<string, unknown>;
    for (const key of Object.keys(input))
      check(`${p}/${key}`, Object.hasOwn(shape, key), 'unknown field');
    const output: Record<string, unknown> = {};
    for (const [key, schema] of Object.entries(shape)) {
      const result = schema(Object.hasOwn(input, key) ? input[key] : undefined, `${p}/${key}`);
      if (result !== undefined) output[key] = result;
    }
    // Each property was constructed by its own schema above, including optional properties.
    return output as { [K in keyof S]: Infer<S[K]> };
  };
}
export const locale = enumeration('en', 'pl', 'ru');
export const zone: Schema<string> = (v, p) => {
  const s = text(v, p);
  try {
    new Intl.DateTimeFormat('en', { timeZone: s });
  } catch {
    throw new FieldError(p, 'unsupported time zone');
  }
  return s;
};
export const studyDate: Schema<string> = (v, p) => {
  const s = text(v, p);
  check(
    p,
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
      Number.isFinite(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    'expected ISO calendar date',
  );
  return s;
};
export const isoInstant: Schema<string> = (v, p) => {
  const s = text(v, p);
  check(
    p,
    Number.isFinite(Date.parse(s)) && new Date(s).toISOString() === s,
    'expected canonical UTC ISO instant',
  );
  return s;
};
export const hash: Schema<string> = (v, p) => {
  const s = text(v, p);
  check(p, /^[0-9a-f]{64}$/.test(s), 'expected lowercase SHA-256');
  return s;
};
