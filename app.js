// App shell: top nav, initial load of cards.json, the global write path, and
// the 401 "token expired" banner. Each screen gets the cards array and a
// `write(mutate, message)` helper that safe-writes and updates the in-memory
// copy. Every load and every write re-reads cards.json, so any device sees the
// latest schedule (ADR-0001).
import { render } from 'preact';
import { useState, useEffect, useMemo, useCallback } from 'preact/hooks';
import { html } from './lib/html.js';
import {
  loadSettings, saveSettings, loadToken, saveToken, clearToken, isConfigured,
} from './lib/store.js';
import { makeGitHub, GitHubError } from './lib/github.js';
import { isNew, isDue } from './lib/fsrs.js';
import { Review } from './screens/Review.js';
import { Add } from './screens/Add.js';
import { Browse } from './screens/Browse.js';
import { Settings } from './screens/Settings.js';

const SCREENS = [
  { id: 'review', label: 'Review' },
  { id: 'add', label: 'Add' },
  { id: 'browse', label: 'Browse' },
  { id: 'settings', label: 'Settings' },
];

function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [token, setToken] = useState(loadToken);
  const [screen, setScreen] = useState('review');
  const [cards, setCards] = useState(null); // null until the first load resolves
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authError, setAuthError] = useState(false);

  const configured = isConfigured(settings, token);
  const api = useMemo(
    () => (configured ? makeGitHub({ ...settings, token }) : null),
    // eslint-disable-next-line — rebuild when any of these change
    [configured, settings.owner, settings.repo, settings.branch, token],
  );

  const reload = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const { cards } = await api.getCards();
      setCards(cards);
      setAuthError(false);
    } catch (e) {
      if (e instanceof GitHubError && e.status === 401) setAuthError(true);
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Load whenever the configured client changes.
  useEffect(() => { reload(); }, [reload]);

  const write = useCallback(async (mutate, message) => {
    if (!api) throw new Error('Add your token and repo in Settings first.');
    try {
      const next = await api.safeWrite(mutate, message);
      setCards(next);
      setAuthError(false);
      setError(null);
      return next;
    } catch (e) {
      if (e instanceof GitHubError && e.status === 401) setAuthError(true);
      setError(e.message || String(e));
      throw e;
    }
  }, [api]);

  const test = useCallback(async () => {
    if (!api) throw new Error('Add your token, owner and repo, then Save first.');
    await api.getCards();
  }, [api]);

  // Persist + reflect settings/token changes.
  function persistSettings(next) {
    saveSettings(next);
    setSettings(loadSettings());
    setError(null);
  }
  function persistToken(t) {
    saveToken(t);
    setToken(loadToken());
    setAuthError(false);
  }
  function doClearToken() {
    clearToken();
    setToken('');
    setCards(null);
  }

  const dueCount = useMemo(() => {
    if (!cards) return 0;
    const now = new Date();
    const due = cards.filter((c) => !isNew(c) && isDue(c, now)).length;
    const fresh = Math.min(cards.filter(isNew).length, settings.dailyNewLimit);
    return due + fresh;
  }, [cards, settings.dailyNewLimit]);

  const effectiveScreen = configured ? screen : 'settings';

  const settingsProps = {
    settings,
    tokenSet: Boolean(token),
    onSaveSettings: persistSettings,
    onSaveToken: persistToken,
    onClearToken: doClearToken,
    onTest: test,
  };

  function renderScreen() {
    if (!configured) {
      return html`
        <div>
          <div class="banner banner-info">Welcome. Add a GitHub token and your repo below to begin.</div>
          <${Settings} ...${settingsProps} />
        </div>`;
    }
    if (effectiveScreen === 'settings') return html`<${Settings} ...${settingsProps} />`;
    if (cards === null) {
      return loading
        ? html`<div class="center muted">Loading cards…</div>`
        : html`<div class="center muted">Couldn't load. <button class="link" onClick=${reload}>Retry</button></div>`;
    }
    switch (effectiveScreen) {
      case 'add': return html`<${Add} cards=${cards} write=${write} />`;
      case 'browse': return html`<${Browse} cards=${cards} write=${write} />`;
      case 'review':
      default: return html`<${Review} cards=${cards} write=${write} settings=${settings} />`;
    }
  }

  return html`
    <div class="app">
      <header class="topbar">
        <div class="brand">🧠 SRS</div>
        <nav class="nav">
          ${SCREENS.map((s) => html`
            <button class=${'nav-btn' + (effectiveScreen === s.id ? ' active' : '')}
              onClick=${() => setScreen(s.id)}>
              ${s.label}${s.id === 'review' && dueCount > 0 ? html`<span class="badge">${dueCount}</span>` : null}
            </button>`)}
        </nav>
      </header>

      ${authError ? html`
        <div class="banner banner-error">
          Token expired or invalid — paste a new one in
          <button class="link" onClick=${() => setScreen('settings')}>Settings</button>.
        </div>` : null}
      ${error && !authError ? html`
        <div class="banner banner-error">${error} <button class="link" onClick=${reload}>retry</button></div>` : null}

      <main class="main">${renderScreen()}</main>
    </div>`;
}

render(html`<${App} />`, document.getElementById('root'));
