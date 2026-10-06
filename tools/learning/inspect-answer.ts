import { readFileSync } from 'node:fs';
import { answerContract, evaluateAnswer } from '../../src/domain/typed-evaluation/evaluate.ts';
import { array, check, id, object, text } from '../../src/contracts/runtime/schema.ts';
import { registry, validateEntry } from '../content/validate-entry.mjs';

const opaque = (value: unknown) => value;
const input = object({
  entry: opaque,
  evidence: opaque,
  contract: answerContract,
  response: (value: unknown, path: string) => {
    check(path, typeof value === 'string', 'expected response');
    return value;
  },
});
const selectedExample = object({
  id,
  target_sense_id: id,
  target_form_ids: array(id),
  accepted_answers: opaque,
});
const files = process.argv.slice(2);
if (!files.length) {
  process.stderr.write(
    'Usage: node tools/learning/inspect-answer.ts <trial.json> [trial.json ...]\n',
  );
  process.exitCode = 1;
}
for (const file of files) {
  try {
    const trial = input(JSON.parse(readFileSync(file, 'utf8')), '$');
    const validation = validateEntry(trial.entry, trial.evidence);
    check('$/entry', validation.valid, validation.errors.join('; '));
    // Entry validation owns the full schema; narrow only fields consumed by this inspector.
    const entry = trial.entry as {
      id: string;
      examples: {
        id: string;
        target_sense_id: string;
        target_form_ids: string[];
        accepted_answers: unknown;
        self_graded?: boolean;
      }[];
      sense: { meanings: Record<string, string[]> };
      lexeme: { morphology: { noun?: { article?: { accepted: string[] } } } };
    };
    const source = entry.examples.find((e) => e.id === trial.contract.exampleId);
    check(
      '$/contract/exampleId',
      source !== undefined,
      'example does not belong to validated entry',
    );
    const example = selectedExample(
      {
        id: source.id,
        target_sense_id: source.target_sense_id,
        target_form_ids: source.target_form_ids,
        accepted_answers: source.accepted_answers,
      },
      '$/example',
    );
    check(
      '$/contract/senseId',
      trial.contract.senseId === entry.id && trial.contract.senseId === example.target_sense_id,
      'sense mismatch',
    );
    check(
      '$/contract/targetFormIds',
      JSON.stringify(trial.contract.targetFormIds) === JSON.stringify(example.target_form_ids),
      'form scope mismatch',
    );
    check(
      '$/contract/accepted_answers',
      JSON.stringify(trial.contract.accepted_answers) === JSON.stringify(example.accepted_answers),
      'answers differ from scoped entry contract',
    );
    check(
      '$/contract/acceptedArticles',
      trial.contract.acceptedArticles.every((article) =>
        entry.lexeme.morphology.noun?.article?.accepted.includes(article),
      ),
      'article not supported by selected entry',
    );
    for (const alternative of trial.contract.alternatives)
      check(
        '$/contract/alternatives',
        Object.entries(registry).some(
          ([key, value]) => key.startsWith('sense:') && value === alternative.senseId,
        ),
        'unissued alternative sense',
      );
    for (const equivalent of trial.contract.reviewedEquivalents) {
      text(equivalent.evidenceRef, '$/evidenceRef');
      check(
        '$/reviewedEquivalents',
        Object.values(entry.sense.meanings).flat().includes(equivalent.surface),
        'equivalent not in entry meanings',
      );
    }
    process.stdout.write(
      `${JSON.stringify({ inspectorOnly: true, ...evaluateAnswer({ ...trial.contract, selfGraded: source.self_graded === true || trial.contract.selfGraded === true }, trial.response) })}\n`,
    );
  } catch (error) {
    process.stderr.write(
      `${file}: ${error instanceof Error ? error.message : 'Answer inspection failed'}\n`,
    );
    process.exitCode = 1;
  }
}
