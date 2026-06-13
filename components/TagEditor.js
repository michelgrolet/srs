// Clickable tag chips built from tags already used across cards.json (to
// encourage reuse), plus a small input to add a new one. Controlled: `value`
// is the selected tag array, `onChange` gets the next array. Shared by Add and
// the Browse edit form.
import { useState } from 'preact/hooks';
import { html } from '../lib/html.js';

export function TagEditor({ allTags = [], value = [], onChange }) {
  const [input, setInput] = useState('');
  const union = [...new Set([...allTags, ...value])].sort((a, b) => a.localeCompare(b));

  function toggle(t) {
    onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  }
  function add() {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput('');
  }

  return html`
    <div class="tag-editor">
      <div class="chips">
        ${union.length === 0
          ? html`<span class="muted">No tags yet — add one below.</span>`
          : union.map((t) => html`
              <button type="button"
                class=${'chip' + (value.includes(t) ? ' chip-on' : '')}
                onClick=${() => toggle(t)}>${t}</button>`)}
      </div>
      <div class="tag-add">
        <input type="text" placeholder="new tag" value=${input}
          onInput=${(e) => setInput(e.target.value)}
          onKeyDown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" class="btn-secondary" onClick=${add}>Add tag</button>
      </div>
    </div>`;
}
