import { readFileSync } from 'node:fs';
import { projectEligibility } from '../../src/domain/time-policy/eligibility.ts';

const files = process.argv.slice(2);
if (!files.length) {
  process.stderr.write(
    'Usage: node tools/learning/inspect-eligibility.ts <projection.json> [projection.json ...]\n',
  );
  process.exitCode = 1;
}
for (const file of files) {
  try {
    const value: unknown = JSON.parse(readFileSync(file, 'utf8'));
    process.stdout.write(`${JSON.stringify(projectEligibility(value))}\n`);
  } catch (error) {
    process.stderr.write(
      `${file}: ${error instanceof Error ? error.message : 'projection failed'}\n`,
    );
    process.exitCode = 1;
  }
}
