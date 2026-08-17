import { useMemo, useRef, useState } from 'preact/hooks';
import { html } from '../lib/html.js';
import { TagPicker } from '../components/TagPicker.js';
import { buildCard } from '../lib/ingest.js';

export function AddCard({ cards, write }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [tags, setTags] = useState([]);
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const questionRef = useRef(null);
  const allTags = useMemo(() => [...new Set(cards.flatMap((card) => card.tags || []))].sort((a, b) => a.localeCompare(b)), [cards]);

  async function submit(event) {
    event?.preventDefault();
    if (busy || !question.trim() || !answer.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const card = buildCard({ question, answer, tags, source });
      await write((current) => [...current, card], `Add card: ${card.question.slice(0, 60)}`);
      setQuestion('');
      setAnswer('');
      setTags([]);
      setSource('');
      setMessage({ type: 'success', text: 'Card added.' });
      questionRef.current?.focus();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  }

  return html`
    <section class="add rise">
      <div class="section-head">
        <div><div class="eyebrow">Add to the stack</div><h1>A card worth remembering.</h1></div>
        <div class="shortcut-note"><span class="kbd">⌘</span><span class="kbd">Enter</span> save</div>
      </div>
      <form class="card-form" onSubmit=${submit} onKeyDown=${(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submit(event);
      }}>
        <label>Question
          <textarea ref=${questionRef} autofocus rows="3" value=${question}
            onInput=${(event) => setQuestion(event.target.value)} placeholder="What do you want to recall?" />
        </label>
        <label>Answer
          <textarea rows="4" value=${answer} onInput=${(event) => setAnswer(event.target.value)}
            placeholder="The shortest complete answer." />
        </label>
        <label>Tags
          <${TagPicker} allTags=${allTags} value=${tags} onChange=${setTags} />
        </label>
        <label class="source-field">Source <span>optional</span>
          <input type="text" value=${source} onInput=${(event) => setSource(event.target.value)} placeholder="URL, book, note…" />
        </label>
        <div class="form-end">
          <button class="btn-primary" type="submit" disabled=${busy || !question.trim() || !answer.trim()}>
            ${busy ? 'Adding…' : 'Add card'} <span class="kbd">⌘↵</span>
          </button>
          ${message ? html`<span class=${`msg ${message.type}`}>${message.text}</span>` : null}
        </div>
      </form>
    </section>`;
}
