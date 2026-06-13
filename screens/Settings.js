// Settings — the GitHub PAT (password field, localStorage), repo owner/name/
// branch, and the daily new-card limit. The token value is never rendered back;
// only its presence is shown (ADR-0005).
import { useState } from 'preact/hooks';
import { html } from '../lib/html.js';

export function Settings({ settings, tokenSet, onSaveSettings, onSaveToken, onClearToken, onTest }) {
  const [owner, setOwner] = useState(settings.owner);
  const [repo, setRepo] = useState(settings.repo);
  const [branch, setBranch] = useState(settings.branch || 'main');
  const [limit, setLimit] = useState(String(settings.dailyNewLimit));
  const [tokenInput, setTokenInput] = useState('');
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  function saveSettings() {
    onSaveSettings({ owner, repo, branch, dailyNewLimit: limit });
    setStatus({ type: 'success', text: 'Settings saved.' });
  }
  function saveTok() {
    if (!tokenInput.trim()) return;
    onSaveToken(tokenInput.trim());
    setTokenInput('');
    setStatus({ type: 'success', text: 'Token saved.' });
  }
  function clearTok() {
    onClearToken();
    setStatus({ type: 'success', text: 'Token cleared.' });
  }
  async function test() {
    setChecking(true);
    setStatus(null);
    try {
      await onTest();
      setStatus({ type: 'success', text: 'Connected — read cards.json OK.' });
    } catch (e) {
      setStatus({ type: 'error', text: e.message });
    } finally {
      setChecking(false);
    }
  }

  return html`
    <div class="settings">
      <section class="card-panel">
        <h3>GitHub token</h3>
        <p class="muted small">
          A fine-grained personal access token, scoped to <strong>this repo only</strong>,
          with <strong>Contents: read and write</strong>. Stored in this browser's localStorage.
        </p>
        <div class="token-status">
          Status: ${tokenSet
            ? html`<span class="ok">● set</span>`
            : html`<span class="off">○ none</span>`}
        </div>
        <div class="row">
          <input type="password" placeholder="github_pat_…" autocomplete="off"
            value=${tokenInput} onInput=${(e) => setTokenInput(e.target.value)} />
          <button class="btn-primary" disabled=${!tokenInput.trim()} onClick=${saveTok}>Save token</button>
          ${tokenSet ? html`<button class="btn-danger" onClick=${clearTok}>Clear token</button>` : null}
        </div>
      </section>

      <section class="card-panel">
        <h3>Repository</h3>
        <div class="grid2">
          <label>Owner
            <input type="text" placeholder="your-username" value=${owner}
              onInput=${(e) => setOwner(e.target.value)} />
          </label>
          <label>Repo name
            <input type="text" placeholder="srs" value=${repo}
              onInput=${(e) => setRepo(e.target.value)} />
          </label>
          <label>Branch
            <input type="text" placeholder="main" value=${branch}
              onInput=${(e) => setBranch(e.target.value)} />
          </label>
          <label>Daily new-card limit
            <input type="number" min="0" step="1" value=${limit}
              onInput=${(e) => setLimit(e.target.value)} />
          </label>
        </div>
        <div class="row">
          <button class="btn-primary" onClick=${saveSettings}>Save settings</button>
          <button class="btn-secondary" disabled=${checking} onClick=${test}>
            ${checking ? 'Testing…' : 'Test connection'}
          </button>
        </div>
      </section>

      ${status ? html`<div class=${'msg ' + status.type}>${status.text}</div>` : null}
    </div>`;
}
