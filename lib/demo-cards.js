const BASE = {
  due: '2000-01-01T00:00:00.000Z',
  stability: 0,
  difficulty: 0,
  elapsed_days: 0,
  scheduled_days: 0,
  learning_steps: 0,
  reps: 0,
  lapses: 0,
  state: 'new',
  last_review: null,
};

export const DEMO_CARDS = [
  {
    ...BASE,
    id: 'demo-active-recall',
    question: 'What makes active recall effective?',
    answer: 'Trying to retrieve an answer strengthens memory more than rereading it.',
    tags: ['Learning'],
    source: 'SRS demo',
    created: '2026-01-01T00:00:00.000Z',
  },
  {
    ...BASE,
    id: 'demo-spacing',
    question: 'Why space reviews over time?',
    answer: 'A little forgetting makes each successful recall more useful.',
    tags: ['Learning'],
    source: 'SRS demo',
    created: '2026-01-01T00:00:01.000Z',
  },
  {
    ...BASE,
    id: 'demo-atomic',
    question: 'What makes a good flashcard?',
    answer: 'One precise question with the shortest complete answer.',
    tags: ['Writing'],
    source: 'SRS demo',
    created: '2026-01-01T00:00:02.000Z',
  },
];

export function freshDemoCards() {
  return structuredClone(DEMO_CARDS);
}
