import { readFileSync } from 'node:fs';
import { replaySchedule } from '../../src/infrastructure/fsrs/replay/replay.ts';

const files = process.argv.slice(2);
if (!files.length) {
  process.stderr.write(
    'Usage: node tools/learning/replay-schedule.ts <history.json> [history.json ...]\n',
  );
  process.exitCode = 1;
}
for (const file of files) {
  try {
    const report = replaySchedule(JSON.parse(readFileSync(file, 'utf8')));
    process.stdout.write(`${JSON.stringify(report)}\n`);
    if (report.status === 'blocked') process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${file}: ${error instanceof Error ? error.message : 'Replay failed'}\n`);
    process.exitCode = 1;
  }
}
