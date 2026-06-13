// Persisted settings + the GitHub PAT, both in localStorage (ADR-0005).
// The token is stored and read here and never logged.
const SETTINGS_KEY = 'srs.settings';
const TOKEN_KEY = 'srs.token';

const DEFAULTS = { owner: '', repo: '', branch: 'main', dailyNewLimit: 20 };

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    owner: (settings.owner || '').trim(),
    repo: (settings.repo || '').trim(),
    branch: (settings.branch || 'main').trim() || 'main',
    dailyNewLimit: clampLimit(settings.dailyNewLimit),
  }));
}

function clampLimit(n) {
  const v = parseInt(n, 10);
  if (!Number.isFinite(v) || v < 0) return 20;
  return Math.min(v, 9999);
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

export function isConfigured(settings, token) {
  return Boolean(token && settings.owner && settings.repo);
}
