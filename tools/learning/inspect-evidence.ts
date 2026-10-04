import { readFileSync } from 'node:fs';
import { inspectEvidence } from '../../src/domain/learning-evidence/project.ts';

const files = process.argv.slice(2);
if (!files.length) {
  process.stderr.write(
    'Usage: node tools/learning/inspect-evidence.ts <evidence.json> [evidence.json ...]\n',
  );
  process.exitCode = 1;
}
for (const file of files) {
  try {
    const input: unknown = JSON.parse(readFileSync(file, 'utf8'));
    if (
      !input ||
      typeof input !== 'object' ||
      !('evidence' in input) ||
      !('eligibility' in input) ||
      Object.keys(input).some((k) => !['evidence', 'eligibility'].includes(k))
    )
      throw new Error('Expected evidence and eligibility input objects');
    process.stdout.write(`${JSON.stringify(inspectEvidence(input.evidence, input.eligibility))}\n`);
  } catch (error) {
    process.stderr.write(
      `${file}: ${error instanceof Error ? error.message : 'inspection failed'}\n`,
    );
    process.exitCode = 1;
  }
}
