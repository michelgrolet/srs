// Render a markdown string as an HTML block.
import { html } from '../lib/html.js';
import { renderMarkdown } from '../lib/markdown.js';

export function Markdown({ src, class: cls = '' }) {
  return html`<div class=${`md ${cls}`} dangerouslySetInnerHTML=${{ __html: renderMarkdown(src) }} />`;
}
