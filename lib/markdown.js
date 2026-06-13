// Render card markdown (question / answer) to HTML via the pinned marked build.
import { marked } from 'marked';

// gfm + line breaks; marked.parse is synchronous by default in this version.
marked.setOptions({ gfm: true, breaks: true });

// Cards are authored by the user (or their own card-writing skill) into their
// own private repo, so the markdown is trusted and rendered as-is.
export function renderMarkdown(src) {
  if (!src) return '';
  return marked.parse(String(src));
}
