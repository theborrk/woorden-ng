import { writeFileSync } from 'node:fs';
import { createEmptyCard, fsrs, FSRSVersion, Grades, Rating, State, TypeConvert } from 'ts-fsrs';
import type { Card, RecordLogItem } from 'ts-fsrs';
import { createdAt, spikeConfig, traceInputs } from './spike-inputs.ts';

function readable(result: RecordLogItem) {
  return {
    card: { ...result.card, state: State[result.card.state] },
    log: { ...result.log, state: State[result.log.state], rating: Rating[result.log.rating] },
  };
}

const scheduler = fsrs(spikeConfig);
const traces = traceInputs.map(({ name, steps }) => {
  let card = createEmptyCard(new Date(createdAt));
  return {
    name,
    steps: steps.map(({ at, rating }) => {
      const result = scheduler.next(card, new Date(at), rating);
      card = result.card;
      return { at, rating: Rating[rating], result: readable(result) };
    }),
  };
});

function traceCard(traceIndex: number, stepIndex: number): Card {
  const step = traces[traceIndex]?.steps[stepIndex];
  if (!step) throw new Error(`Missing trace ${traceIndex}, step ${stepIndex}`);
  return TypeConvert.card({
    ...step.result.card,
    state: TypeConvert.state(step.result.card.state),
  });
}

const newCard = createEmptyCard(new Date(createdAt));
const cases = [
  { name: 'new', card: newCard },
  {
    name: 'learning-step-0',
    card: scheduler.next(newCard, new Date(createdAt), Rating.Again).card,
  },
  { name: 'learning-step-1', card: traceCard(0, 0) },
  { name: 'review-after-several-reviews', card: traceCard(0, 4) },
  { name: 'relearning-step-0', card: traceCard(0, 5) },
  { name: 'relearning-step-1', card: traceCard(0, 6) },
  { name: 'review-at-maximum', card: traceCard(1, 2) },
].map(({ name, card }) => ({
  name,
  at: card.due,
  card: { ...card, state: State[card.state] },
  ratings: Object.fromEntries(
    Grades.map((rating) => [Rating[rating], readable(scheduler.next(card, card.due, rating))]),
  ),
}));

writeFileSync(
  new URL('./fixtures/scheduling.json', import.meta.url),
  `${JSON.stringify({ engine: FSRSVersion, parameters: scheduler.parameters, cases, traces }, null, 2)}\n`,
);
