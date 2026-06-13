// GitHub Contents API client with safe-write (ADR-0001). The repo IS the
// database: every change is GET (content + sha) -> mutate -> PUT(sha). On a 409
// (the sha went stale because another device wrote since our GET) we re-fetch,
// re-apply the change, and retry — which makes sequential multi-device use
// lossless. The token is sent as a Bearer header and never logged.

const API = 'https://api.github.com';
const PATH = 'cards.json';
const API_VERSION = '2022-11-28';

export class GitHubError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
  }
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
  };
}

// atob/btoa are Latin1-only and throw on emoji/accents, so round-trip through
// UTF-8 bytes. GitHub's `content` field also carries embedded newlines.
function decodeBase64Utf8(b64) {
  const bin = atob((b64 || '').replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function makeGitHub({ owner, repo, branch = 'main', token }) {
  const fileUrl = `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${PATH}`;

  async function toError(res) {
    let body = null;
    try { body = await res.json(); } catch { /* non-JSON body */ }
    const msg = (body && body.message) || `HTTP ${res.status}`;
    if (res.status === 401) {
      return new GitHubError(401, 'Token expired or invalid. Paste a new one in Settings.');
    }
    if (res.status === 403 || res.status === 404) {
      return new GitHubError(res.status,
        `Can't reach ${owner}/${repo} (${msg}). Check the token has Contents read+write on this exact repo.`);
    }
    return new GitHubError(res.status, msg);
  }

  // Read cards.json -> { cards, sha }. `cache: no-store` avoids a stale CDN read.
  async function getCards() {
    const res = await fetch(`${fileUrl}?ref=${encodeURIComponent(branch)}`, {
      method: 'GET',
      headers: authHeaders(token),
      cache: 'no-store',
    });
    if (!res.ok) throw await toError(res);
    const data = await res.json();
    const text = decodeBase64Utf8(data.content);
    let cards;
    try {
      cards = JSON.parse(text.trim() || '[]');
    } catch (e) {
      throw new GitHubError(0, 'cards.json is not valid JSON: ' + e.message);
    }
    if (!Array.isArray(cards)) throw new GitHubError(0, 'cards.json must be a JSON array.');
    return { cards, sha: data.sha };
  }

  // Write the full cards array back, targeting `sha` (optimistic concurrency).
  async function putCards(cards, sha, message) {
    const body = {
      message,
      content: encodeBase64Utf8(JSON.stringify(cards, null, 2) + '\n'),
      branch,
    };
    if (sha) body.sha = sha;
    const res = await fetch(fileUrl, {
      method: 'PUT',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await toError(res);
    return res.json();
  }

  // SAFE-WRITE: GET -> mutate(cards) -> PUT(sha); retry on 409. `mutate` must be
  // a pure function of the current cards so re-applying after a conflict is
  // correct (e.g. find-by-id and update, append, filter). Returns written cards.
  async function safeWrite(mutate, message) {
    let lastErr;
    for (let attempt = 0; attempt < 6; attempt++) {
      const { cards, sha } = await getCards();
      const next = mutate(cards.map((c) => ({ ...c })));
      try {
        await putCards(next, sha, message);
        return next;
      } catch (e) {
        if (e instanceof GitHubError && e.status === 409) { lastErr = e; continue; }
        throw e;
      }
    }
    throw lastErr || new GitHubError(409, 'Write kept conflicting; please try again.');
  }

  return { getCards, putCards, safeWrite, owner, repo, branch };
}
