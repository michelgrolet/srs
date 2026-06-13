// The single ingest path shared by the paste box and the manual form (ADR-0004).
// It validates the authoring shape (question + answer required; tags + source
// optional), strips anything app-owned from the input, and stamps id + created
// + a fresh new-card FSRS state. Pasted scheduling fields are never trusted.
import { uuid } from './format.js';
import { newFsrsState } from './fsrs.js';

// Strip // and /* */ comments and trailing commas WITHOUT corrupting string
// values — e.g. a URL "https://example.com" in `source` must survive. We walk
// the text tracking whether we're inside a "..." string, so only real syntax is
// touched. This lets the card-writing skill's commented JSONC paste as-is.
export function stripJsonc(text) {
  let out = '';
  let inStr = false, esc = false, inLine = false, inBlock = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inLine) {
      if (c === '\n') { inLine = false; out += c; }
      continue;
    }
    if (inBlock) {
      if (c === '*' && n === '/') { inBlock = false; i++; }
      continue;
    }
    if (inStr) {
      out += c;
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; out += c; continue; }
    if (c === '/' && n === '/') { inLine = true; i++; continue; }
    if (c === '/' && n === '*') { inBlock = true; i++; continue; }
    out += c;
  }
  // Drop trailing commas: a comma followed only by whitespace then } or ].
  return out.replace(/,(\s*[}\]])/g, '$1');
}

function cleanTags(tags) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const out = [];
  for (const t of tags) {
    if (typeof t !== 'string') continue;
    const v = t.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

// Build one stored card from an authoring-shape object. Throws if question or
// answer is missing. id / created / FSRS state are generated here, never read
// from the input.
export function buildCard(authoring, now = new Date()) {
  const q = authoring && authoring.question;
  const a = authoring && authoring.answer;
  if (typeof q !== 'string' || !q.trim()) throw new Error('`question` is required');
  if (typeof a !== 'string' || !a.trim()) throw new Error('`answer` is required');
  const hasSource = typeof authoring.source === 'string' && authoring.source.trim();
  return {
    id: uuid(),
    question: q.trim(),
    answer: a.trim(),
    tags: cleanTags(authoring.tags),
    ...(hasSource ? { source: authoring.source.trim() } : {}),
    created: now.toISOString(),
    ...newFsrsState(now),
  };
}

// Apply an edit to an existing card, preserving id / created / FSRS state.
export function editCard(card, fields) {
  const q = fields.question, a = fields.answer;
  if (typeof q !== 'string' || !q.trim()) throw new Error('`question` is required');
  if (typeof a !== 'string' || !a.trim()) throw new Error('`answer` is required');
  const next = { ...card, question: q.trim(), answer: a.trim(), tags: cleanTags(fields.tags) };
  if (typeof fields.source === 'string' && fields.source.trim()) next.source = fields.source.trim();
  else delete next.source;
  return next;
}

// Tolerant parse of pasted text -> array of authoring objects (single or array).
export function parseAuthoringText(text) {
  const cleaned = stripJsonc(text).trim();
  if (!cleaned) throw new Error('Paste is empty.');
  let data;
  try {
    data = JSON.parse(cleaned);
  } catch (e) {
    throw new Error('Could not parse JSON: ' + e.message);
  }
  const arr = Array.isArray(data) ? data : [data];
  if (arr.length === 0) throw new Error('No cards found in paste.');
  return arr;
}

// Full paste ingest -> { cards, errors }. Builds every valid card and collects
// per-item errors so one malformed card doesn't sink the whole batch.
export function ingestPaste(text, now = new Date()) {
  const items = parseAuthoringText(text);
  const cards = [];
  const errors = [];
  items.forEach((item, i) => {
    try {
      cards.push(buildCard(item, now));
    } catch (e) {
      errors.push(`Card ${i + 1}: ${e.message}`);
    }
  });
  return { cards, errors };
}
