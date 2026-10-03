import { Rating } from 'ts-fsrs';
import type { FSRSParameters, Grade } from 'ts-fsrs';

// Spike inputs only; W10 will own the production parameter registry and adapter.
export const spikeConfig = {
  request_retention: 0.9,
  maximum_interval: 365,
  enable_short_term: true,
  enable_fuzz: false,
  learning_steps: ['1m', '10m'],
  relearning_steps: ['1m', '10m'],
} satisfies Partial<FSRSParameters>;

export const createdAt = '2026-01-01T12:00:00.000Z';

interface TraceInput {
  name: string;
  steps: { at: string; rating: Grade }[];
}

export const traceInputs: TraceInput[] = [
  {
    name: 'learning-reviews-lapse-relearning',
    steps: [
      { at: createdAt, rating: Rating.Good },
      { at: '2026-01-01T12:10:00.000Z', rating: Rating.Good },
      { at: '2026-01-03T12:10:00.000Z', rating: Rating.Good },
      { at: '2026-01-14T12:10:00.000Z', rating: Rating.Hard },
      { at: '2026-02-15T12:10:00.000Z', rating: Rating.Easy },
      { at: '2026-07-11T12:10:00.000Z', rating: Rating.Again },
      { at: '2026-07-11T12:11:00.000Z', rating: Rating.Good },
      { at: '2026-07-11T12:21:00.000Z', rating: Rating.Good },
    ],
  },
  {
    name: 'easy-reviews-reach-maximum',
    steps: [
      { at: createdAt, rating: Rating.Easy },
      { at: '2026-01-09T12:00:00.000Z', rating: Rating.Easy },
      { at: '2026-03-16T12:00:00.000Z', rating: Rating.Easy },
    ],
  },
];
