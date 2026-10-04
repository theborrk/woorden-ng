import { readFileSync } from 'node:fs';
import { classifyAttempt } from '../../src/domain/attempt-scoring/classify.ts';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node tools/learning/inspect-scoring.ts TRIAL.json [...]');
  process.exitCode = 1;
}
for (const file of files) {
  try {
    const value: unknown = JSON.parse(readFileSync(file, 'utf8'));
    const classification = classifyAttempt(value);
    console.log(JSON.stringify({ file, ...classification }));
    if (!classification.valid) process.exitCode = 1;
  } catch (error) {
    console.error(`${file}: ${error instanceof Error ? error.message : 'Inspection failed'}`);
    process.exitCode = 1;
  }
}
