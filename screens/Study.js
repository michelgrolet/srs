import { useState, useEffect, useMemo, useCallback } from 'preact/hooks';
import { html } from '../lib/html.js';
import { Markdown } from '../components/Markdown.js';
import { previewRatings, applyRating, ratingLabel, isNew } from '../lib/fsrs.js';
import { formatInterval, formatDue } from '../lib/format.js';
import { ALL_REVIEW_TAGS, buildReviewQueue, filterReviewCards, listReviewTags } from '../lib/review.js';

export function Study({ cards, write, onAdd }) {
  const [selectedTag, setSelectedTag] = useState(ALL_REVIEW_TAGS);
  const [queue, setQueue] = useState(() => buildReviewQueue(cards));
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState(false);
  const tags = useMemo(() => listReviewTags(cards), [cards]);
  const scopedCards = useMemo(() => filterReviewCards(cards, selectedTag), [cards, selectedTag]);
  const card = useMemo(() => {
    const id = queue[position];
    return id ? cards.find((item) => item.id === id) || null : null;
  }, [queue, position, cards]);
  const previews = useMemo(() => (card ? previewRatings(card) : []), [card?.id, card?.due]);

  useEffect(() => {
    if (position < queue.length && !card) setPosition((current) => current + 1);
  }, [position, queue, card]);

  function chooseTag(tag) {
    if (tag === selectedTag) return;
    setSelectedTag(tag);
    setQueue(buildReviewQueue(cards, { tag }));
    setPosition(0);
    setRevealed(false);
  }

  const rate = useCallback(async (value) => {
    if (!card || rating) return;
    setRating(true);
    const update = applyRating(card, value, new Date());
    try {
      await write(
        (current) => current.map((item) => (item.id === card.id ? { ...item, ...update } : item)),
        `Review card: ${card.question.slice(0, 60)} (${ratingLabel(value)})`,
      );
      setRevealed(false);
      setPosition((current) => current + 1);
    } finally {
      setRating(false);
    }
  }, [card, rating, write]);

  useEffect(() => {
    function onKey(event) {
      if (event.target && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      if (!card) return;
      if (!revealed && (event.code === 'Space' || event.key === ' ')) {
        event.preventDefault();
        setRevealed(true);
      } else if (revealed && ['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault();
        const option = previews[Number(event.key) - 1];
        if (option) rate(option.rating);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, revealed, previews, rate]);

  const tagFilters = tags.length ? html`
    <div class="review-scope">
      <span class="review-scope-label">Review</span>
      <div class="review-filter" role="group" aria-label="Filter review cards by tag">
        <button class=${selectedTag === ALL_REVIEW_TAGS ? 'filter-chip active' : 'filter-chip'}
          aria-pressed=${selectedTag === ALL_REVIEW_TAGS} onClick=${() => chooseTag(ALL_REVIEW_TAGS)}>All</button>
        ${tags.map((tag) => html`
          <button class=${selectedTag === tag ? 'filter-chip active' : 'filter-chip'}
            aria-pressed=${selectedTag === tag} onClick=${() => chooseTag(tag)}>${tag}</button>`)}
      </div>
    </div>` : null;

  if (!card) {
    const now = new Date();
    const nextDue = scopedCards
      .filter((item) => !isNew(item))
      .map((item) => new Date(item.due))
      .filter((date) => date > now)
      .sort((a, b) => a - b)[0];
    return html`
      <section class="review rise">
        ${tagFilters}
        <div class="review-done">
          <div class="done-orbit"><span>✓</span></div>
          <div class="eyebrow">${selectedTag === ALL_REVIEW_TAGS ? 'Stack clear' : `${selectedTag} clear`}</div>
          <h1>That’s enough for now.</h1>
          <p>${cards.length === 0 ? 'Add your first card.' : nextDue ? `Next review ${formatDue(nextDue, now)}.` : 'Nothing scheduled ahead.'}</p>
          ${cards.length === 0 ? html`<button class="btn-primary" onClick=${onAdd}>Add a card</button>` : null}
        </div>
      </section>`;
  }

  return html`
    <section class="review rise">
      ${tagFilters}
      <div class="review-top">
        <div class="progress"><span style=${`width:${((position + 1) / queue.length) * 100}%`}></span></div>
        <div class="review-count">${position + 1} / ${queue.length}</div>
      </div>

      <article class=${`study-card${revealed ? ' revealed' : ''}`}>
        <div class="card-meta">
          <span>${revealed ? 'Answer' : 'Question'}</span>
          <div class="card-tags">${(card.tags || []).map((tag) => html`<span class="tag">${tag}</span>`)}</div>
        </div>
        <div class="question"><${Markdown} src=${card.question} class="q" /></div>
        ${revealed ? html`
          <div class="answer-divider"></div>
          <div class="answer"><${Markdown} src=${card.answer} class="a" /></div>` : null}
      </article>

      ${!revealed ? html`
        <button class="reveal" onClick=${() => setRevealed(true)}><span>Show answer</span><span class="kbd">Space</span></button>` : html`
        <div class="ratings">
          ${previews.map((option) => html`
            <button class=${`rate rate-${option.key}`} disabled=${rating} onClick=${() => rate(option.rating)}>
              <span class="rate-key">${option.hint}</span>
              <span class="rate-label">${option.label}</span>
              <span class="rate-interval">${formatInterval(option.due)}</span>
            </button>`)}
        </div>`}
    </section>`;
}
