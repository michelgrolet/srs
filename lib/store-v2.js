export function loadRepository() {
  const configured = document.querySelector('meta[name="srs-repository"]')?.content?.trim();
  const pagesOwner = location.hostname.endsWith('.github.io') ? location.hostname.slice(0, -10) : '';
  const pagesRepo = location.pathname.split('/').filter(Boolean)[0] || '';
  const raw = configured && configured !== 'auto'
    ? configured
    : pagesOwner && pagesRepo
      ? `${pagesOwner}/${pagesRepo}`
      : 'owner/srs';
  const [owner, repo] = raw.split('/');
  return { owner, repo, branch: 'main' };
}

function tokenKey(repository) {
  return `srs.token:${repository.owner}/${repository.repo}`;
}

export function loadToken(repository) {
  return localStorage.getItem(tokenKey(repository)) || '';
}

export function saveToken(repository, token) {
  localStorage.setItem(tokenKey(repository), (token || '').trim());
}

export function clearToken(repository) {
  localStorage.removeItem(tokenKey(repository));
}
