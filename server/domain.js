import { buildCard, editCard } from '../lib/ingest.js';
import { applyRating, isDue, isNew, RATINGS } from '../lib/fsrs.js';

export function listTags(cards) {
  const counts = new Map();
  for (const card of cards) {
    for (const tag of card.tags || []) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, count }));
}

function tagKey(tag) {
  return tag.trim().toLocaleLowerCase().replace(/[\s_-]+/g, '');
}

export function resolveTags(requested = [], existing = []) {
  const byKey = new Map(existing.map((tag) => [tagKey(tag), tag]));
  const resolved = [];
  const unknown = [];
  for (const raw of requested || []) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const clean = raw.trim();
    const known = byKey.get(tagKey(clean));
    const value = known || clean;
    if (!resolved.includes(value)) resolved.push(value);
    if (!known && !unknown.includes(clean)) unknown.push(clean);
  }
  return { resolved, unknown };
}

export function findCard(cards, cardId) {
  const card = cards.find((item) => item.id === cardId);
  if (!card) throw new Error(`No card found with id ${cardId}.`);
  return card;
}

export function searchCards(cards, { query = '', tag, state, limit = 50 } = {}) {
  const needle = query.trim().toLocaleLowerCase();
  return cards
    .filter((card) => !tag || (card.tags || []).includes(tag))
    .filter((card) => !state || card.state === state)
    .filter((card) => {
      if (!needle) return true;
      return [card.question, card.answer, card.source, ...(card.tags || [])]
        .some((value) => String(value || '').toLocaleLowerCase().includes(needle));
    })
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .slice(0, limit);
}

export function nextReviewCard(cards, tag, now = new Date()) {
  const matching = tag ? cards.filter((card) => (card.tags || []).includes(tag)) : cards;
  const due = matching
    .filter((card) => !isNew(card) && isDue(card, now))
    .sort((a, b) => new Date(a.due) - new Date(b.due));
  return due[0] || matching.find(isNew) || null;
}

export function rateCard(card, ratingName, now = new Date()) {
  const option = RATINGS.find((rating) => rating.key === ratingName);
  if (!option) throw new Error('Rating must be again, hard, good, or easy.');
  return { ...card, ...applyRating(card, option.rating, now) };
}

export function createCards(authoring, cards, allowNewTags = false, now = new Date()) {
  const existing = listTags(cards).map((tag) => tag.name);
  const prepared = authoring.map((item) => {
    const tags = resolveTags(item.tags, existing);
    return { item: { ...item, tags: tags.resolved }, unknown: tags.unknown };
  });
  const unknown = [...new Set(prepared.flatMap((item) => item.unknown))];
  if (unknown.length && existing.length && !allowNewTags) {
    return { needsConfirmation: true, unknown, existing };
  }
  return {
    needsConfirmation: false,
    cards: prepared.map(({ item }) => buildCard(item, now)),
  };
}

export function updateCard(card, fields, allCards, allowNewTags = false) {
  const existing = listTags(allCards).map((tag) => tag.name);
  const tags = fields.tags === undefined
    ? { resolved: card.tags || [], unknown: [] }
    : resolveTags(fields.tags, existing);
  if (tags.unknown.length && existing.length && !allowNewTags) {
    return { needsConfirmation: true, unknown: tags.unknown, existing };
  }
  return {
    needsConfirmation: false,
    card: editCard(card, {
      question: fields.question ?? card.question,
      answer: fields.answer ?? card.answer,
      tags: tags.resolved,
      source: fields.source ?? card.source ?? '',
    }),
  };
}
