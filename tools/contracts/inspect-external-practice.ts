import { readFileSync } from 'node:fs';
import {
  ExternalPracticeObservationV1Schema,
  TutorSessionPackageV1Schema,
} from '../../src/contracts/external-practice/schemas.ts';
import { classifyDuplicate } from '../../src/contracts/external-practice/duplicates.ts';

try {
  const [mode, file, ...previousFiles] = process.argv.slice(2);
  if (!file || (mode !== 'session' && mode !== 'observation')) {
    throw new Error(
      'Usage: node tools/contracts/inspect-external-practice.ts session|observation FILE [PREVIOUS_OBSERVATION_FILES...]',
    );
  }
  const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8')) as unknown;
  if (mode === 'session') {
    if (previousFiles.length) throw new Error('Session inspection takes exactly one file');
    console.log(
      JSON.stringify({ valid: true, package: TutorSessionPackageV1Schema.parse(read(file)) }),
    );
  } else {
    const observation = ExternalPracticeObservationV1Schema.parse(read(file));
    const previous = previousFiles.map((path) =>
      ExternalPracticeObservationV1Schema.parse(read(path)),
    );
    console.log(
      JSON.stringify({
        valid: true,
        observation,
        duplicate: classifyDuplicate(observation, previous),
        gradingEligible: false,
        reason:
          'External reported claims are not app-observed graded attempts (I23); no FSRS transition is permitted.',
      }),
    );
  }
} catch (error) {
  console.error(
    JSON.stringify({ valid: false, error: error instanceof Error ? error.message : String(error) }),
  );
  process.exitCode = 1;
}
