// Add — two paths into one ingest function (ADR-0004): a tolerant paste box
// (single object or array, JSONC allowed) and a manual form with reused tag
// chips. Both build cards via lib/ingest and safe-write an append.
import { useState, useMemo, useEffect } from 'preact/hooks';
import { html } from '../lib/html.js';
import { TagEditor } from '../components/TagEditor.js';
import { ingestPaste, buildCard, parseAuthoringText } from '../lib/ingest.js';

const PLACEHOLDER = `Paste authoring-shape JSON — one card or an array.
// comments and trailing commas are fine.

{
  "question": "What does FSRS optimize for?",
  "answer": "The **fewest reviews** to hold a target retention.",
  "tags": ["SRS", "algorithms"],
  "source": "ADR-0002"
}`;

export function Add({ cards, write }) {
  const [tab, setTab] = useState('manual');
  const allTags = useMemo(() => {
    const s = new Set();
    cards.forEach((c) => (c.tags || []).forEach((t) => s.add(t)));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [cards]);

  return html`
    <div class="add">
      <div class="tabs">
        <button class=${'tab' + (tab === 'paste' ? ' active' : '')} onClick=${() => setTab('paste')}>Paste</button>
        <button class=${'tab' + (tab === 'form' ? ' active' : '')} onClick=${() => setTab('form')}>Manual</button>
      </div>
      ${tab === 'paste'
        ? html`<${PasteForm} write=${write} />`
        : html`<${ManualForm} write=${write} allTags=${allTags} />`}
    </div>`;
}

function PasteForm({ write }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const { cards: built, errors } = ingestPaste(text);
      if (built.length === 0) {
        setMsg({ type: 'error', text: errors.join(' · ') || 'No valid cards found.' });
      } else {
        await write((cs) => [...cs, ...built],
          `Add ${built.length} card${built.length > 1 ? 's' : ''}`);
        setText('');
        setMsg({
          type: 'success',
          text: `Added ${built.length} card${built.length > 1 ? 's' : ''}.`
            + (errors.length ? ` Skipped ${errors.length}: ${errors.join(' · ')}` : ''),
        });
      }
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return html`
    <div class="pane">
      <textarea class="paste-box" rows="14" placeholder=${PLACEHOLDER}
        value=${text} onInput=${(e) => setText(e.target.value)}></textarea>
      <div class="row">
        <button class="btn-primary" disabled=${busy || !text.trim()} onClick=${submit}>
          ${busy ? 'Adding…' : 'Add cards'}
        </button>
        ${msg ? html`<span class=${'msg ' + msg.type}>${msg.text}</span>` : null}
      </div>
    </div>`;
}

function ManualForm({ write, allTags }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [tags, setTags] = useState([]);
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // Ctrl/Cmd+V of authoring-shape JSON fills the fields instead of dumping raw
  // text into the focused box. Non-JSON (or JSON that isn't a card) pastes
  // normally. Listener lives only while the manual tab is mounted.
  useEffect(() => {
    function onPaste(e) {
      const text = (e.clipboardData || window.clipboardData)?.getData('text');
      if (!text || !text.trim()) return;
      let items;
      try { items = parseAuthoringText(text); } catch { return; } // not JSON -> normal paste
      const first = items[0];
      if (!first || typeof first !== 'object' || (!('question' in first) && !('answer' in first))) return;
      e.preventDefault();
      setQuestion(typeof first.question === 'string' ? first.question : '');
      setAnswer(typeof first.answer === 'string' ? first.answer : '');
      setTags(Array.isArray(first.tags) ? first.tags.filter((t) => typeof t === 'string') : []);
      setSource(typeof first.source === 'string' ? first.source : '');
      setMsg({
        type: 'success',
        text: items.length > 1
          ? `Filled from the first of ${items.length} cards — use the Paste tab to add all ${items.length} at once.`
          : 'Filled fields from pasted JSON.',
      });
    }
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const card = buildCard({ question, answer, tags, source });
      await write((cs) => [...cs, card], 'Add card');
      setQuestion('');
      setAnswer('');
      setTags([]);
      setSource('');
      setMsg({ type: 'success', text: 'Card added.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return html`
    <form class="pane form" onSubmit=${submit}>
      <label>Question <span class="req">*</span>
        <textarea rows="3" value=${question} onInput=${(e) => setQuestion(e.target.value)}
          placeholder="The prompt side. Markdown allowed."></textarea>
      </label>
      <label>Answer <span class="req">*</span>
        <textarea rows="3" value=${answer} onInput=${(e) => setAnswer(e.target.value)}
          placeholder="The recall side. Markdown allowed."></textarea>
      </label>
      <label>Tags
        <${TagEditor} allTags=${allTags} value=${tags} onChange=${setTags} />
      </label>
      <label>Source
        <input type="text" value=${source} onInput=${(e) => setSource(e.target.value)}
          placeholder="Optional — where the fact came from" />
      </label>
      <div class="row">
        <button class="btn-primary" type="submit" disabled=${busy || !question.trim() || !answer.trim()}>
          ${busy ? 'Adding…' : 'Add card'}
        </button>
        ${msg ? html`<span class=${'msg ' + msg.type}>${msg.text}</span>` : null}
      </div>
    </form>`;
}
