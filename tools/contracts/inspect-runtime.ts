import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { canonicalRecord } from '../../src/contracts/runtime/canonical.ts';

// Node 24 strips TypeScript directly; no build, runtime service, or package script needed.
const files = process.argv.slice(2);
if (files.length === 0) {
  process.stderr.write(
    'Usage: node tools/contracts/inspect-runtime.ts <record.json> [record.json ...]\n',
  );
  process.exitCode = 1;
}
for (const file of files) {
  try {
    const input: unknown = JSON.parse(readFileSync(file, 'utf8'));
    const { record, canonical, bytes } = canonicalRecord(input);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    process.stdout.write(
      `${JSON.stringify({ kind: record.kind, identity: 'id' in record ? record.id : 'profileId' in record ? record.profileId : record.scheduler.parameterSetId, canonical, sha256 })}\n`,
    );
  } catch (error) {
    process.stderr.write(
      `${file}: ${error instanceof Error ? error.message : 'inspection failed'}\n`,
    );
    process.exitCode = 1;
  }
}
