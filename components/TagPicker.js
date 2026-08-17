import { useMemo, useState } from 'preact/hooks';
import { html } from '../lib/html.js';

export function TagPicker({ allTags = [], value = [], onChange }) {
  const [input, setInput] = useState('');
  const [focus, setFocus] = useState(false);
  const suggestions = useMemo(() => {
    const needle = input.trim().toLocaleLowerCase();
    return allTags
      .filter((tag) => !value.includes(tag))
      .filter((tag) => !needle || tag.toLocaleLowerCase().includes(needle))
      .slice(0, 8);
  }, [allTags, value, input]);

  function choose(tag) {
    if (!value.includes(tag)) onChange([...value, tag]);
    setInput('');
  }

  function add() {
    const clean = input.trim();
    if (!clean) return;
    const known = allTags.find((tag) => tag.toLocaleLowerCase() === clean.toLocaleLowerCase());
    choose(known || clean);
  }

  return html`
    <div class="tag-editor">
      ${value.length ? html`<div class="selected-tags">
        ${value.map((tag) => html`<button type="button" class="chip chip-on" onClick=${() => onChange(value.filter((item) => item !== tag))}>${tag}<span>×</span></button>`)}
      </div>` : null}
      <div class="tag-input-wrap">
        <input type="text" placeholder="Find or add a tag" value=${input}
          onFocus=${() => setFocus(true)} onBlur=${() => setTimeout(() => setFocus(false), 120)}
          onInput=${(event) => setInput(event.target.value)}
          onKeyDown=${(event) => {
            if (event.key === 'Enter') { event.preventDefault(); suggestions[0] ? choose(suggestions[0]) : add(); }
            if (event.key === 'Escape') setInput('');
          }} />
        <span class="kbd">Enter</span>
        ${focus && (suggestions.length || input.trim()) ? html`
          <div class="tag-suggestions">
            ${suggestions.map((tag, index) => html`
              <button type="button" class=${index === 0 ? 'suggestion first' : 'suggestion'} onMouseDown=${() => choose(tag)}>
                <span>${tag}</span><small>${index === 0 ? 'reuse' : ''}</small>
              </button>`)}
            ${input.trim() && !allTags.some((tag) => tag.toLocaleLowerCase() === input.trim().toLocaleLowerCase()) ? html`
              <button type="button" class="suggestion new-tag" onMouseDown=${add}><span>Create “${input.trim()}”</span><small>new</small></button>` : null}
          </div>` : null}
      </div>
      ${allTags.length ? html`<div class="tag-hint">Existing: ${allTags.slice(0, 7).join(' · ')}${allTags.length > 7 ? ' …' : ''}</div>` : null}
    </div>`;
}
