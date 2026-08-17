import test from 'node:test';
import assert from 'node:assert/strict';
import { createCards, listTags, nextReviewCard, resolveTags, searchCards } from '../server/domain.js';

const now = new Date('2026-08-17T10:00:00.000Z');
const existing = [
  {
    id: 'one', question: 'What is RAG?', answer: 'Retrieval-Augmented Generation', tags: ['AI', 'LLM'],
    source: 'notes', created: now.toISOString(), due: now.toISOString(), state: 'new',
    stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, learning_steps: 0,
    reps: 0, lapses: 0, last_review: null,
  },
];

test('tags are counted and sorted', () => {
  assert.deepEqual(listTags([...existing, { ...existing[0], id: 'two', tags: ['AI'] }]), [
    { name: 'AI', count: 2 },
    { name: 'LLM', count: 1 },
  ]);
});

test('tag spelling reuses the existing canonical tag', () => {
  assert.deepEqual(resolveTags(['ai', 'large-language-models'], ['AI', 'LLM']), {
    resolved: ['AI', 'large-language-models'],
    unknown: ['large-language-models'],
  });
});

test('new tags need an explicit second call', () => {
  const result = createCards([{ question: 'Q', answer: 'A', tags: ['ML'] }], existing, false, now);
  assert.deepEqual(result, { needsConfirmation: true, unknown: ['ML'], existing: ['AI', 'LLM'] });
});

test('a confirmed card is created with canonical tags and scheduling state', () => {
  const result = createCards([{ question: 'Q', answer: 'A', tags: ['ai', 'ML'] }], existing, true, now);
  assert.equal(result.needsConfirmation, false);
  assert.deepEqual(result.cards[0].tags, ['AI', 'ML']);
  assert.equal(result.cards[0].state, 'new');
});

test('search looks through questions, answers, tags, and sources', () => {
  assert.equal(searchCards(existing, { query: 'retrieval' }).length, 1);
  assert.equal(searchCards(existing, { query: 'notes' }).length, 1);
  assert.equal(searchCards(existing, { tag: 'Other' }).length, 0);
});

test('the next review never leaks the answer', () => {
  const card = nextReviewCard(existing, undefined, now);
  assert.equal(card.id, 'one');
});
