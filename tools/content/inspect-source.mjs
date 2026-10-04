import { createHash } from 'node:crypto';
import { createReadStream, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const schema = JSON.parse(
  readFileSync(
    new URL('../../content/schemas/source-manifest.schema.json', import.meta.url),
    'utf8',
  ),
);
const measured = ['schema_version', 'bytes', 'sha256'];

function validValue(value, rule) {
  if ('const' in rule) return value === rule.const;
  if (rule.type === 'integer') {
    return Number.isSafeInteger(value) && value >= rule.minimum && value <= rule.maximum;
  }
  if (rule.type === 'array') {
    return (
      Array.isArray(value) &&
      (!rule.uniqueItems || new Set(value).size === value.length) &&
      value.every((item) => validValue(item, rule.items))
    );
  }
  if (typeof value !== 'string' || (rule.pattern && !new RegExp(rule.pattern).test(value)))
    return false;
  if (rule.format === 'uri') {
    try {
      const url = new URL(value);
      return Boolean(url.hostname) && !url.username && !url.password;
    } catch {
      return false;
    }
  }
  if (rule.format === 'date-time') {
    // Require an explicit timezone and a real calendar date, without consulting the live clock.
    const match =
      /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(
        value,
      );
    if (!match || !Number.isFinite(Date.parse(value))) return false;
    return new Date(`${match[1]}T00:00:00Z`).toISOString().slice(0, 10) === match[1];
  }
  return true;
}

export function validateManifest(value, { metadataOnly = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid source manifest: expected an object.');
  const keys = schema.required.filter((key) => !metadataOnly || !measured.includes(key));
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) throw new Error(`Invalid source manifest: unexpected field ${key}.`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key) || !validValue(value[key], schema.properties[key])) {
      throw new Error(`Invalid source manifest: ${key}.`);
    }
  }
}

export async function inspectSource(file, metadata, expected) {
  validateManifest(metadata, { metadataOnly: true });
  if (expected !== undefined) validateManifest(expected);
  const hash = createHash('sha256');
  let bytes = 0;
  // Hash original bytes in bounded memory; never decode, normalize or extract lexical facts.
  for await (const chunk of createReadStream(file)) {
    bytes += chunk.length;
    hash.update(chunk);
  }
  const manifest = {
    schema_version: 1,
    source_id: metadata.source_id,
    url: metadata.url,
    retrieved_at: metadata.retrieved_at,
    bytes,
    sha256: hash.digest('hex'),
    format: metadata.format,
    version: metadata.version,
    lineage: [...metadata.lineage],
  };
  validateManifest(manifest);
  if (expected !== undefined) {
    for (const key of schema.required) {
      if (JSON.stringify(manifest[key]) !== JSON.stringify(expected[key])) {
        throw new Error(
          `Source mismatch: ${key}; expected ${JSON.stringify(expected[key])}, inspected ${JSON.stringify(manifest[key])}. File not adopted.`,
        );
      }
    }
  }
  return manifest;
}

export async function run(args = process.argv.slice(2)) {
  if (
    args.length !== 4 ||
    args[0] !== 'inspect' ||
    !['--metadata', '--expected'].includes(args[2])
  ) {
    throw new Error(
      'Usage: npm run content:sources -- inspect <local-file> (--metadata <metadata.json> | --expected <manifest.json>)',
    );
  }
  const input = JSON.parse(readFileSync(args[3], 'utf8'));
  const expected = args[2] === '--expected' ? input : undefined;
  if (expected !== undefined) validateManifest(expected);
  const metadata =
    expected === undefined
      ? input
      : Object.fromEntries(Object.entries(input).filter(([key]) => !measured.includes(key)));
  const manifest = await inspectSource(args[1], metadata, expected);
  // Successful inspection is the only stdout output. This command never writes or adopts files.
  console.log(JSON.stringify(manifest, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
