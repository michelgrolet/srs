import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_REVIEW_TAGS, buildReviewQueue, filterReviewCards, listReviewTags } from '../lib/review.js';

const now = new Date('2026-08-18T12:00:00.000Z');
const cards = [
  { id: 'new-ai', state: 'new', due: now.toISOString(), tags: ['AI'] },
  { id: 'due-systems', state: 'review', due: '2026-08-17T12:00:00.000Z', tags: ['Systems'] },
  { id: 'due-ai', state: 'review', due: '2026-08-16T12:00:00.000Z', tags: ['AI', 'Systems'] },
  { id: 'future-ai', state: 'review', due: '2026-08-19T12:00:00.000Z', tags: ['AI'] },
];

test('review tags are unique and sorted', () => {
  assert.deepEqual(listReviewTags(cards), ['AI', 'Systems']);
});

test('all-tag scope leaves the stack unchanged', () => {
  assert.equal(filterReviewCards(cards, ALL_REVIEW_TAGS), cards);
});

test('tag scope keeps exact matches only', () => {
  assert.deepEqual(filterReviewCards(cards, 'Systems').map((card) => card.id), ['due-systems', 'due-ai']);
});

test('a tag-filtered queue contains its due cards before its new cards', () => {
  assert.deepEqual(buildReviewQueue(cards, { tag: 'AI', now }), ['due-ai', 'new-ai']);
  assert.deepEqual(buildReviewQueue(cards, { tag: 'Systems', now }), ['due-ai', 'due-systems']);
});
