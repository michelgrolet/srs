// The only module that talks to ts-fsrs (ADR-0002). It translates between our
// stored card shape — plain JSON, dates as ISO strings, `state` as a lowercase
// string — and ts-fsrs's Card, which uses Date objects and a numeric `state`.
import { fsrs, generatorParameters, createEmptyCard, Rating, State } from 'ts-fsrs';

// One scheduler for the app. Fuzz spreads out due dates so reviews don't pile
// up on the same day over years of use.
const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

// numeric ts-fsrs State <-> our stored string
const STATE_TO_STR = ['new', 'learning', 'review', 'relearning'];
const STR_TO_STATE = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

// The four review options, in button order. `rating` is the ts-fsrs numeric
// grade; `hint` is the 1-4 keyboard shortcut.
export const RATINGS = [
  { key: 'again', rating: Rating.Again, label: 'Again', hint: '1' },
  { key: 'hard', rating: Rating.Hard, label: 'Hard', hint: '2' },
  { key: 'good', rating: Rating.Good, label: 'Good', hint: '3' },
  { key: 'easy', rating: Rating.Easy, label: 'Easy', hint: '4' },
];

export function ratingLabel(rating) {
  const r = RATINGS.find((x) => x.rating === rating);
  return r ? r.label : 'Manual';
}

// The FSRS fields for a fresh card: state "new", due now, immediately reviewable.
export function newFsrsState(now = new Date()) {
  return fromFsrsCard(createEmptyCard(now));
}

// stored card -> ts-fsrs CardInput (revive dates, map state to its enum)
function toFsrsCard(c) {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days ?? 0,
    scheduled_days: c.scheduled_days ?? 0,
    learning_steps: c.learning_steps ?? 0,
    reps: c.reps,
    lapses: c.lapses,
    state: STR_TO_STATE[c.state] ?? State.New,
    last_review: c.last_review ? new Date(c.last_review) : undefined,
  };
}

// ts-fsrs Card -> our stored FSRS fields (JSON-safe). We persist the full
// ts-fsrs state (incl. elapsed_days / scheduled_days / learning_steps) so the
// scheduler is stateless across reloads and devices.
function fromFsrsCard(fc) {
  return {
    due: new Date(fc.due).toISOString(),
    stability: fc.stability,
    difficulty: fc.difficulty,
    elapsed_days: fc.elapsed_days ?? 0,
    scheduled_days: fc.scheduled_days ?? 0,
    learning_steps: fc.learning_steps ?? 0,
    reps: fc.reps,
    lapses: fc.lapses,
    state: STATE_TO_STR[fc.state] ?? 'new',
    last_review: fc.last_review ? new Date(fc.last_review).toISOString() : null,
  };
}

// The four rating options for a card, each with its predicted next due date and
// interval in days. Drives the rating buttons.
export function previewRatings(card, now = new Date()) {
  const log = scheduler.repeat(toFsrsCard(card), now);
  return RATINGS.map((r) => {
    const next = log[r.rating].card;
    return { ...r, due: new Date(next.due), scheduledDays: next.scheduled_days };
  });
}

// Apply one rating; returns the new stored FSRS fields to merge onto the card.
export function applyRating(card, rating, now = new Date()) {
  const next = scheduler.next(toFsrsCard(card), now, rating).card;
  return fromFsrsCard(next);
}

export function isDue(card, now = new Date()) {
  return new Date(card.due).getTime() <= now.getTime();
}

export function isNew(card) {
  return card.state === 'new';
}
