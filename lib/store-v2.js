const TOKEN_KEY = 'srs.token';

export function loadRepository() {
  const raw = document.querySelector('meta[name="srs-repository"]')?.content || 'michelgrolet/srs';
  const [owner, repo] = raw.split('/');
  return { owner, repo, branch: 'main' };
}

export function loadToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, (token || '').trim());
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
