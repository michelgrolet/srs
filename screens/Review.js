// Review (default screen). Pulls all due cards plus up to the daily new-card
// limit, shows the question, reveals the answer on Space/tap, then offers the
// four FSRS rating buttons (keys 1-4) each labelled with its predicted next
// interval. Rating updates FSRS state and safe-writes to cards.json.
import { useState, useEffect, useMemo, useCallback } from 'preact/hooks';
import { html } from '../lib/html.js';
import { Markdown } from '../components/Markdown.js';
import { previewRatings, applyRating, ratingLabel, isDue, isNew } from '../lib/fsrs.js';
import { formatInterval, formatDue } from '../lib/format.js';

// Due (non-new) cards, most overdue first, then up to `limit` new cards.
function buildQueue(cards, limit, now = new Date()) {
  const due = cards
    .filter((c) => !isNew(c) && isDue(c, now))
    .sort((a, b) => new Date(a.due) - new Date(b.due));
  const fresh = cards.filter(isNew).slice(0, Math.max(0, limit));
  return [...due, ...fresh].map((c) => c.id);
}

export function Review({ cards, write, settings }) {
  // Freeze the queue when the screen mounts so rating doesn't reshuffle it.
  const [queue, setQueue] = useState(() => buildQueue(cards, settings.dailyNewLimit));
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState(false);

  const card = useMemo(() => {
    const id = queue[pos];
    return id ? cards.find((c) => c.id === id) || null : null;
  }, [queue, pos, cards]);

  const previews = useMemo(() => (card ? previewRatings(card) : []), [card && card.id]);

  // Skip cards deleted elsewhere mid-session.
  useEffect(() => {
    if (pos < queue.length && !card) setPos((p) => p + 1);
  }, [pos, queue, card]);

  const rate = useCallback(async (ratingValue) => {
    if (!card || rating) return;
    setRating(true);
    const update = applyRating(card, ratingValue, new Date());
    try {
      await write(
        (cs) => cs.map((c) => (c.id === card.id ? { ...c, ...update } : c)),
        `Review "${card.question.slice(0, 60)}" (${ratingLabel(ratingValue)})`,
      );
      setRevealed(false);
      setPos((p) => p + 1);
    } catch {
      // Error is surfaced by the App banner; leave the card up so it can retry.
    } finally {
      setRating(false);
    }
  }, [card, rating, write]);

  // Keyboard: Space reveals, 1-4 rate. Ignore when typing in a field.
  useEffect(() => {
    function onKey(e) {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (!card) return;
      if (!revealed && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const opt = previews[Number(e.key) - 1];
        if (opt) rate(opt.rating);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, revealed, previews, rate]);

  function restart() {
    setQueue(buildQueue(cards, settings.dailyNewLimit));
    setPos(0);
    setRevealed(false);
  }

  // ---- All done ----
  if (!card) {
    const now = new Date();
    const nextDue = cards
      .filter((c) => !isNew(c))
      .map((c) => new Date(c.due))
      .filter((d) => d > now)
      .sort((a, b) => a - b)[0];
    const heldNew = cards.filter(isNew).length;
    const moreReady = buildQueue(cards, settings.dailyNewLimit, now).length > 0;

    return html`
      <div class="review done">
        <div class="done-check">✓</div>
        <h2>All done</h2>
        ${cards.length === 0
          ? html`<p class="muted">No cards yet. Add some on the <strong>Add</strong> screen.</p>`
          : nextDue
            ? html`<p class="muted">Next review ${formatDue(nextDue, now)}.</p>`
            : html`<p class="muted">Nothing scheduled ahead.</p>`}
        ${heldNew > 0 ? html`
          <p class="muted small">${heldNew} new card${heldNew > 1 ? 's' : ''} held back by your daily limit (${settings.dailyNewLimit}). Raise it in Settings to study more today.</p>` : null}
        ${moreReady ? html`
          <button class="btn-primary" onClick=${restart}>Start another session</button>` : null}
      </div>`;
  }

  // ---- A card ----
  return html`
    <div class="review">
      <div class="review-progress">${pos + 1} / ${queue.length}</div>

      <div class="card-face">
        <div class="face-label">Question</div>
        <${Markdown} src=${card.question} class="q" />
      </div>

      ${!revealed
        ? html`
          <button class="btn-primary reveal" onClick=${() => setRevealed(true)}>
            Show answer <span class="kbd">Space</span>
          </button>`
        : html`
          <div class="card-face answer">
            <div class="face-label">Answer</div>
            <${Markdown} src=${card.answer} class="a" />
          </div>
          <div class="ratings">
            ${previews.map((p) => html`
              <button class=${`rate rate-${p.key}`} disabled=${rating}
                onClick=${() => rate(p.rating)}>
                <span class="rate-label">${p.label}</span>
                <span class="rate-interval">${formatInterval(p.due)}</span>
                <span class="kbd">${p.hint}</span>
              </button>`)}
          </div>`}

      ${card.tags && card.tags.length
        ? html`<div class="card-tags">${card.tags.map((t) => html`<span class="tag">${t}</span>`)}</div>`
        : null}
    </div>`;
}
