import { useState, useEffect, useMemo, useCallback } from 'preact/hooks';
import { html } from '../lib/html.js';
import { Markdown } from '../components/Markdown.js';
import { previewRatings, applyRating, ratingLabel, isDue, isNew } from '../lib/fsrs.js';
import { formatInterval, formatDue } from '../lib/format.js';

function buildQueue(cards, now = new Date()) {
  const due = cards
    .filter((card) => !isNew(card) && isDue(card, now))
    .sort((a, b) => new Date(a.due) - new Date(b.due));
  return [...due, ...cards.filter(isNew)].map((card) => card.id);
}

export function Study({ cards, write, onAdd }) {
  const [queue, setQueue] = useState(() => buildQueue(cards));
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState(false);
  const card = useMemo(() => {
    const id = queue[position];
    return id ? cards.find((item) => item.id === id) || null : null;
  }, [queue, position, cards]);
  const previews = useMemo(() => (card ? previewRatings(card) : []), [card?.id, card?.due]);

  useEffect(() => {
    if (position < queue.length && !card) setPosition((current) => current + 1);
  }, [position, queue, card]);

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

  if (!card) {
    const now = new Date();
    const nextDue = cards
      .filter((item) => !isNew(item))
      .map((item) => new Date(item.due))
      .filter((date) => date > now)
      .sort((a, b) => a - b)[0];
    return html`
      <section class="review-done rise">
        <div class="done-orbit"><span>✓</span></div>
        <div class="eyebrow">Stack clear</div>
        <h1>That’s enough for now.</h1>
        <p>${cards.length === 0 ? 'Add your first card.' : nextDue ? `Next review ${formatDue(nextDue, now)}.` : 'Nothing scheduled ahead.'}</p>
        ${cards.length === 0 ? html`<button class="btn-primary" onClick=${onAdd}>Add a card</button>` : null}
      </section>`;
  }

  return html`
    <section class="review rise">
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
