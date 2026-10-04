import { readFileSync } from 'node:fs';
import { createFsrsAdapter, ratings } from '../../src/infrastructure/fsrs/adapter/adapter.ts';
import {
  array,
  enumeration,
  instant,
  object,
  optional,
} from '../../src/contracts/runtime/schema.ts';

const input = object({
  parameterSet: (value: unknown) => value,
  createdAt: instant,
  initial: optional((value: unknown) => value),
  steps: array(object({ at: instant, rating: enumeration(...ratings) })),
});
const files = process.argv.slice(2);
if (!files.length) {
  process.stderr.write(
    'Usage: node tools/learning/inspect-fsrs.ts <sequence.json> [sequence.json ...]\n',
  );
  process.exitCode = 1;
}
for (const file of files) {
  try {
    const sequence = input(JSON.parse(readFileSync(file, 'utf8')), '$');
    const adapter = createFsrsAdapter(sequence.parameterSet);
    let card =
      sequence.initial === undefined
        ? adapter.createTask(sequence.createdAt)
        : adapter.deserialize(JSON.stringify(sequence.initial));
    const initial = card;
    const steps = sequence.steps.map(({ at, rating }) => {
      const previews = adapter.preview(card, at);
      // Never apply a preview object: compute against the current card and captured step instant.
      const result = adapter.applyRating(card, at, rating);
      card = result.after;
      return { at, rating, previews, result };
    });
    process.stdout.write(`${JSON.stringify({ ...adapter.metadata(), initial, steps })}\n`);
  } catch (error) {
    process.stderr.write(
      `${file}: ${error instanceof Error ? error.message : 'inspection failed'}\n`,
    );
    process.exitCode = 1;
  }
}
