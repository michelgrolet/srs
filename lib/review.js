import { isDue, isNew } from './fsrs.js';

export const ALL_REVIEW_TAGS = 'all';

export function listReviewTags(cards) {
  return [...new Set(cards.flatMap((card) => card.tags || []))]
    .sort((left, right) => left.localeCompare(right));
}

export function filterReviewCards(cards, tag = ALL_REVIEW_TAGS) {
  if (tag === ALL_REVIEW_TAGS) return cards;
  return cards.filter((card) => (card.tags || []).includes(tag));
}

export function buildReviewQueue(cards, { tag = ALL_REVIEW_TAGS, now = new Date() } = {}) {
  const scoped = filterReviewCards(cards, tag);
  const due = scoped
    .filter((card) => !isNew(card) && isDue(card, now))
    .sort((left, right) => new Date(left.due) - new Date(right.due));
  return [...due, ...scoped.filter(isNew)].map((card) => card.id);
}
