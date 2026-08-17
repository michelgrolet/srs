import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { html } from '../lib/html.js';
import { Markdown } from '../components/Markdown.js';
import { TagPicker } from '../components/TagPicker.js';
import { editCard } from '../lib/ingest.js';
import { formatDue } from '../lib/format.js';

export function BrowseCards({ cards, write }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const searchRef = useRef(null);
  const allTags = useMemo(() => [...new Set(cards.flatMap((card) => card.tags || []))].sort((a, b) => a.localeCompare(b)), [cards]);
  const shown = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return cards
      .filter((card) => filter === 'all' || (card.tags || []).includes(filter))
      .filter((card) => !needle || [card.question, card.answer, card.source, ...(card.tags || [])]
        .some((value) => String(value || '').toLocaleLowerCase().includes(needle)))
      .sort((a, b) => new Date(a.due) - new Date(b.due));
  }, [cards, filter, query]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName || '')) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape' && document.activeElement === searchRef.current) {
        setQuery('');
        searchRef.current.blur();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function remove(card) {
    if (!confirm(`Delete this card?\n\n${card.question.slice(0, 120)}`)) return;
    await write((current) => current.filter((item) => item.id !== card.id), `Delete card: ${card.question.slice(0, 60)}`);
  }

  return html`
    <section class="browse rise">
      <div class="section-head browse-title">
        <div><div class="eyebrow">The whole stack</div><h1>${shown.length} card${shown.length === 1 ? '' : 's'}</h1></div>
        <div class="search-box"><span>⌕</span><input ref=${searchRef} type="text" placeholder="Search"
          value=${query} onInput=${(event) => setQuery(event.target.value)} /><span class="kbd">/</span></div>
      </div>
      <div class="filter-row">
        <button class=${filter === 'all' ? 'filter-chip active' : 'filter-chip'} onClick=${() => setFilter('all')}>All</button>
        ${allTags.map((tag) => html`<button class=${filter === tag ? 'filter-chip active' : 'filter-chip'} onClick=${() => setFilter(tag)}>${tag}</button>`)}
      </div>
      ${shown.length === 0 ? html`<div class="empty">No cards here.</div>` : html`
        <ul class="card-list">
          ${shown.map((card) => editingId === card.id ? html`
            <li class="card-row editing" key=${card.id}><${EditCard} card=${card} allTags=${allTags} write=${write} onDone=${() => setEditingId(null)} /></li>` : html`
            <li class="card-row" key=${card.id}>
              <div class="card-main">
                <${Markdown} src=${card.question} class="row-q" />
                <div class="row-meta">
                  <span class=${`pill state-${card.state}`}>${card.state}</span>
                  <span>due ${formatDue(card.due)}</span>
                  ${(card.tags || []).map((tag) => html`<span class="tag">${tag}</span>`)}
                </div>
              </div>
              <div class="card-actions">
                <button class="icon-btn" title="Edit" onClick=${() => setEditingId(card.id)}>Edit</button>
                <button class="icon-btn danger" title="Delete" onClick=${() => remove(card)}>Delete</button>
              </div>
            </li>`)}
        </ul>`}
    </section>`;
}

function EditCard({ card, allTags, write, onDone }) {
  const [question, setQuestion] = useState(card.question);
  const [answer, setAnswer] = useState(card.answer);
  const [tags, setTags] = useState(card.tags || []);
  const [source, setSource] = useState(card.source || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const updated = editCard(card, { question, answer, tags, source });
      await write((current) => current.map((item) => item.id === card.id ? updated : item), `Update card: ${updated.question.slice(0, 60)}`);
      onDone();
    } catch (caught) {
      setError(caught.message);
      setBusy(false);
    }
  }

  return html`
    <div class="edit-form">
      <label>Question<textarea rows="2" value=${question} onInput=${(event) => setQuestion(event.target.value)} /></label>
      <label>Answer<textarea rows="3" value=${answer} onInput=${(event) => setAnswer(event.target.value)} /></label>
      <label>Tags<${TagPicker} allTags=${allTags} value=${tags} onChange=${setTags} /></label>
      <label>Source<input type="text" value=${source} onInput=${(event) => setSource(event.target.value)} /></label>
      <div class="row">
        <button class="btn-primary" disabled=${busy} onClick=${save}>${busy ? 'Saving…' : 'Save'}</button>
        <button class="btn-quiet" disabled=${busy} onClick=${onDone}>Cancel</button>
        ${error ? html`<span class="msg error">${error}</span>` : null}
      </div>
    </div>`;
}
