# 0006 — Keep cards.json out of the public Pages site

The repo is private (ADR-0001), but on GitHub's free plan a Pages site built
from a private repo is still **public** — access control on Pages needs a paid
plan. A plain ("no Jekyll") build publishes every file in the repo as-is, which
means `cards.json` — the user's actual review data — would be served at a public
URL (`https://<user>.github.io/srs/cards.json`) to anyone who guessed it. That
silently defeats the point of a private repo.

The app never reads `cards.json` from its own Pages origin: it reads and writes
through the authenticated GitHub Contents API (`api.github.com`) using the
pasted token (ADR-0001, ADR-0005). So `cards.json` does not need to exist in the
published site at all — it only needs to live in the repo. We therefore exclude
it (and the internal design docs) from what Pages publishes, via a minimal
Jekyll `_config.yml` `exclude:` list, and remove the `.nojekyll` file that would
otherwise force a raw, everything-is-public build.

## Considered Options

- **Jekyll `exclude` (chosen)** — one `_config.yml` lists the files Pages must
  not publish (`cards.json`, `docs/`, `CONTEXT.md`). Jekyll runs server-side on
  GitHub's infrastructure and only filters which static files ship; it does not
  transform our files (none carry YAML front matter), so the no-build, no-JSX
  stance of ADR-0003 is intact. Keeps `index.html` at the repo root.
- **`.nojekyll` raw serve (rejected)** — simplest, but publishes `cards.json`
  publicly. This is the bug this ADR exists to prevent.
- **GitHub Actions deploy that uploads only the app files (rejected)** — fully
  deterministic, but reintroduces a CI build pipeline, which ADR-0003 explicitly
  rejected for a tool this size.
- **Move the app into a `/docs` subfolder and serve Pages from it (rejected)** —
  would hide `cards.json` (it stays at the root, outside the published folder)
  but breaks the "entry is `index.html` at the repo root" requirement.
- **Paid plan with private Pages access control (rejected)** — costs money and
  is unnecessary; the static app shell has no secrets, only the data needs to be
  withheld, which the exclude handles for free.

## Consequences

- `_config.yml` is effectively the deploy manifest of what is **not** published.
  Any future file that holds private data must be added to its `exclude` list.
- The app must keep reading `cards.json` only via `api.github.com`, never from a
  relative URL on its own origin (it already does — see `lib/github.js`).
- A correct deploy can be checked from outside: the app files (`index.html`,
  `app.js`, `lib/`, …) return 200 at the Pages URL, while `cards.json`,
  `_config.yml`, and `docs/` return 404.
- The static app shell (HTML/JS) remains public. That is acceptable: it contains
  no secrets, and the token is pasted by the user at runtime.
