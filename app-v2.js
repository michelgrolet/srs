import { render } from 'preact';
import { useState, useEffect, useMemo, useCallback } from 'preact/hooks';
import { html } from './lib/html.js';
import { loadRepository, loadToken, saveToken, clearToken } from './lib/store-v2.js';
import { makeGitHub, GitHubError } from './lib/github.js';
import { isNew, isDue } from './lib/fsrs.js';
import { Study } from './screens/Study.js';
import { AddCard } from './screens/AddCard.js';
import { BrowseCards } from './screens/BrowseCards.js';

const SCREENS = [
  { id: 'review', label: 'Review', hint: 'R' },
  { id: 'add', label: 'Add', hint: 'A' },
  { id: 'browse', label: 'Browse', hint: 'B' },
];

function Connect({ repository, tokenSet, onSave, onClear, onCancel }) {
  const [value, setValue] = useState('');
  function submit(event) {
    event.preventDefault();
    if (value.trim()) onSave(value.trim());
  }
  return html`
    <section class="connect-panel rise">
      <div class="eyebrow">One-time connection</div>
      <h1>Your stack, everywhere.</h1>
      <p>Paste a fine-grained GitHub token with Contents read and write access to <strong>${repository.owner}/${repository.repo}</strong>. It stays in this browser.</p>
      <form onSubmit=${submit}>
        <label>GitHub token
          <input autofocus type="password" autocomplete="off" placeholder="github_pat_…"
            value=${value} onInput=${(event) => setValue(event.target.value)} />
        </label>
        <div class="row">
          <button class="btn-primary" disabled=${!value.trim()} type="submit">Connect <span class="kbd">Enter</span></button>
          ${tokenSet ? html`<button class="btn-quiet" type="button" onClick=${onCancel}>Cancel</button>` : null}
          ${tokenSet ? html`<button class="btn-danger" type="button" onClick=${onClear}>Forget token</button>` : null}
        </div>
      </form>
    </section>`;
}

function App() {
  const repository = useMemo(loadRepository, []);
  const [token, setToken] = useState(loadToken);
  const [screen, setScreen] = useState('review');
  const [cards, setCards] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authError, setAuthError] = useState(false);
  const configured = Boolean(token);
  const api = useMemo(() => configured ? makeGitHub({ ...repository, token }) : null,
    [configured, repository.owner, repository.repo, repository.branch, token]);

  const reload = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.getCards();
      setCards(response.cards);
      setAuthError(false);
    } catch (caught) {
      if (caught instanceof GitHubError && caught.status === 401) setAuthError(true);
      setError(caught.message || String(caught));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    function onKey(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      const next = { r: 'review', a: 'add', b: 'browse' }[event.key.toLowerCase()];
      if (next && configured) setScreen(next);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [configured]);

  const write = useCallback(async (mutate, message) => {
    if (!api) throw new Error('Connect this browser first.');
    try {
      const next = await api.safeWrite(mutate, message);
      setCards(next);
      setAuthError(false);
      setError(null);
      return next;
    } catch (caught) {
      if (caught instanceof GitHubError && caught.status === 401) setAuthError(true);
      setError(caught.message || String(caught));
      throw caught;
    }
  }, [api]);

  function persistToken(next) {
    saveToken(next);
    setToken(loadToken());
    setAuthError(false);
    setScreen('review');
  }
  function forgetToken() {
    clearToken();
    setToken('');
    setCards(null);
    setAuthError(false);
    setError(null);
  }

  const dueCount = useMemo(() => cards ? cards.filter((card) => isNew(card) || isDue(card, new Date())).length : 0, [cards]);
  const effectiveScreen = configured ? screen : 'connect';

  function renderScreen() {
    if (effectiveScreen === 'connect') return html`<${Connect} repository=${repository} tokenSet=${configured}
      onSave=${persistToken} onClear=${forgetToken} onCancel=${() => setScreen('review')} />`;
    if (cards === null) return loading
      ? html`<div class="loading"><span></span><p>Opening your stack</p></div>`
      : html`<div class="empty">Couldn't load your cards. <button class="text-link" onClick=${reload}>Retry</button></div>`;
    if (effectiveScreen === 'add') return html`<${AddCard} cards=${cards} write=${write} />`;
    if (effectiveScreen === 'browse') return html`<${BrowseCards} cards=${cards} write=${write} />`;
    return html`<${Study} cards=${cards} write=${write} onAdd=${() => setScreen('add')} />`;
  }

  return html`
    <div class="sky" aria-hidden="true"><i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i><i class="grain"></i></div>
    <div class="app">
      <header class="topbar">
        <button class="brand" onClick=${() => configured && setScreen('review')}><span class="brand-mark">S</span><span>SRS</span></button>
        <div class="stack-stat">${cards ? html`<strong>${cards.length}</strong> cards · <strong>${dueCount}</strong> due` : 'one stack'}</div>
        <nav class="nav" aria-label="Main navigation">
          ${SCREENS.map((item) => html`
            <button class=${'nav-btn' + (effectiveScreen === item.id ? ' active' : '')} disabled=${!configured} onClick=${() => setScreen(item.id)}>
              <span>${item.label}</span><span class="kbd">${item.hint}</span>
              ${item.id === 'review' && dueCount > 0 ? html`<span class="badge">${dueCount}</span>` : null}
            </button>`)}
          <button class=${'connect-btn' + (effectiveScreen === 'connect' ? ' active' : '')}
            title="Connection" aria-label="Connection" onClick=${() => setScreen('connect')}>⌁</button>
        </nav>
      </header>
      ${authError ? html`<div class="banner banner-error">Your token expired. <button class="text-link" onClick=${() => setScreen('connect')}>Replace it</button></div>` : null}
      ${error && !authError ? html`<div class="banner banner-error">${error} <button class="text-link" onClick=${reload}>Retry</button></div>` : null}
      <main class=${`main screen-${effectiveScreen}`}>${renderScreen()}</main>
    </div>`;
}

render(html`<${App} />`, document.getElementById('root'));
