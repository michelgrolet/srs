// Browse — list every card, filter by tag, edit or delete. Edits and deletes
// safe-write to cards.json and preserve id / created / FSRS state.
import { useState, useMemo } from 'preact/hooks';
import { html } from '../lib/html.js';
import { Markdown } from '../components/Markdown.js';
import { TagEditor } from '../components/TagEditor.js';
import { editCard } from '../lib/ingest.js';
import { formatDue } from '../lib/format.js';

export function Browse({ cards, write }) {
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);

  const allTags = useMemo(() => {
    const s = new Set();
    cards.forEach((c) => (c.tags || []).forEach((t) => s.add(t)));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [cards]);

  const shown = useMemo(() => {
    const list = filter === 'all'
      ? cards.slice()
      : cards.filter((c) => (c.tags || []).includes(filter));
    return list.sort((a, b) => new Date(a.due) - new Date(b.due));
  }, [cards, filter]);

  async function remove(card) {
    if (!confirm(`Delete this card?\n\n${card.question.slice(0, 120)}`)) return;
    await write((cs) => cs.filter((c) => c.id !== card.id),
      `Delete "${card.question.slice(0, 60)}"`);
  }

  return html`
    <div class="browse">
      <div class="browse-head">
        <div class="count">${shown.length} card${shown.length === 1 ? '' : 's'}</div>
        <label class="filter">Tag
          <select value=${filter} onChange=${(e) => setFilter(e.target.value)}>
            <option value="all">all</option>
            ${allTags.map((t) => html`<option value=${t}>${t}</option>`)}
          </select>
        </label>
      </div>

      ${shown.length === 0
        ? html`<p class="muted center">No cards${filter !== 'all' ? ` tagged "${filter}"` : ''} yet.</p>`
        : html`<ul class="card-list">
            ${shown.map((card) => editingId === card.id
              ? html`<li class="card-row editing" key=${card.id}>
                  <${EditRow} card=${card} allTags=${allTags} write=${write}
                    onDone=${() => setEditingId(null)} />
                </li>`
              : html`<li class="card-row" key=${card.id}>
                  <div class="card-main">
                    <${Markdown} src=${card.question} class="row-q" />
                    <div class="row-meta">
                      <span class=${`pill state-${card.state}`}>${card.state}</span>
                      <span class="muted small">due ${formatDue(card.due)}</span>
                      ${(card.tags || []).map((t) => html`<span class="tag">${t}</span>`)}
                      ${card.source ? html`<span class="muted small">· ${card.source}</span>` : null}
                    </div>
                  </div>
                  <div class="card-actions">
                    <button class="btn-secondary" onClick=${() => setEditingId(card.id)}>Edit</button>
                    <button class="btn-danger" onClick=${() => remove(card)}>Delete</button>
                  </div>
                </li>`)}
          </ul>`}
    </div>`;
}

function EditRow({ card, allTags, write, onDone }) {
  const [question, setQuestion] = useState(card.question);
  const [answer, setAnswer] = useState(card.answer);
  const [tags, setTags] = useState(card.tags || []);
  const [source, setSource] = useState(card.source || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const updated = editCard(card, { question, answer, tags, source });
      await write((cs) => cs.map((c) => (c.id === card.id ? updated : c)),
        `Edit "${updated.question.slice(0, 60)}"`);
      onDone();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return html`
    <div class="edit-form">
      <label>Question
        <textarea rows="2" value=${question} onInput=${(e) => setQuestion(e.target.value)}></textarea>
      </label>
      <label>Answer
        <textarea rows="2" value=${answer} onInput=${(e) => setAnswer(e.target.value)}></textarea>
      </label>
      <label>Tags
        <${TagEditor} allTags=${allTags} value=${tags} onChange=${setTags} />
      </label>
      <label>Source
        <input type="text" value=${source} onInput=${(e) => setSource(e.target.value)} />
      </label>
      <div class="row">
        <button class="btn-primary" disabled=${busy} onClick=${save}>${busy ? 'Saving…' : 'Save'}</button>
        <button class="btn-secondary" disabled=${busy} onClick=${onDone}>Cancel</button>
        ${err ? html`<span class="msg error">${err}</span>` : null}
      </div>
    </div>`;
}
