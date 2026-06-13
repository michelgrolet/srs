# 0005 — Browser auth via a scoped fine-grained PAT in localStorage

The web UI needs write access to `cards.json`, but it is a static GitHub Pages
site with no backend, so it cannot hold an OAuth client secret to run a proper
"Sign in with GitHub" flow. Instead the user pastes a GitHub fine-grained
personal access token, scoped to only the `srs` repo with Contents read + write
and nothing else, into a Settings screen. It is stored in `localStorage` and
renewed when it expires (1-year expiry).

## Considered Options

- **Scoped fine-grained PAT in localStorage (chosen)** — the pragmatic ceiling
  for a backendless static app; minimal blast radius (one repo's contents).
- **OAuth "Sign in with GitHub" (rejected)** — needs a server-side secret to
  exchange the login code for a token; impossible on static hosting without
  standing up a backend, which we explicitly avoided (ADR-0001).

## Consequences

- The token is a real credential in the browser. Risk is bounded by the narrow
  scope (one private repo, contents only) and the single-user,
  no-third-party-scripts nature of the app.
- The token expires (1 year) and must be re-pasted; the app should detect a 401
  response and prompt to refresh it.
