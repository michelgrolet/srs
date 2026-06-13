# SRS

A personal spaced-repetition system. A static web app on GitHub Pages with **no
backend and no build step**: the repo itself is the database — every card and its
FSRS schedule lives in [`cards.json`](cards.json), read and written through the
GitHub Contents API. See [`CONTEXT.md`](CONTEXT.md) for the domain glossary and
[`docs/adr/`](docs/adr) for the architecture decisions.

**Live app:** https://michelgrolet.github.io/srs/

## First-time setup (one human step)

The app needs a token to read and write your cards. Mint a **fine-grained
personal access token** scoped to this repo only:

1. Go to **GitHub → Settings → Developer settings → Fine-grained tokens →
   Generate new token** (https://github.com/settings/tokens?type=beta).
2. **Resource owner:** your account · **Repository access:** *Only select
   repositories* → `srs`.
3. **Permissions → Repository → Contents:** *Read and write*. (Metadata: Read is
   added automatically. Nothing else.)
4. Set an expiry (e.g. 1 year), generate, and copy the `github_pat_…` value.
5. Open the live app → **Settings** → paste the token, set **Owner** =
   `michelgrolet` and **Repo** = `srs`, **Save**. Hit **Test connection**.

The token is stored in your browser's `localStorage` and sent only to
`api.github.com`. When it expires the app shows a "token expired" banner — mint a
new one and re-paste. See [ADR-0005](docs/adr/0005-browser-auth-scoped-pat.md).

## Using it

- **Review** — due cards plus up to your daily new-card limit. *Space* reveals
  the answer, then **Again / Hard / Good / Easy** (keys **1–4**), each showing
  the predicted next interval. Every rating safe-writes the new schedule.
- **Add** — paste authoring-shape JSON (one card or an array; `//` comments and
  trailing commas are fine), or use the manual form with reused tag chips.
- **Browse** — list, filter by tag, edit, delete.
- **Settings** — token, repo, daily new-card limit.

Cards are authored in the shape `{ question, answer, tags?, source? }`; the app
owns `id`, `created`, and all FSRS state. See
[ADR-0004](docs/adr/0004-paste-authoring-shape.md).

## Develop locally

No toolchain. Serve the folder and open it:

```sh
python3 -m http.server 8011   # then open http://localhost:8011
```

The app talks to `api.github.com` regardless of origin (CORS allows it), so a
local copy reads and writes the same `cards.json` once you paste a token.
Dependencies are pinned ES modules loaded from a CDN via the import map in
[`index.html`](index.html) — nothing to install.

## Layout

```
index.html        entry + import map (every dependency pinned here)
app.js            Preact shell: nav, initial load, central safe-write, 401 banner
styles.css        all styling (system fonts, light/dark, responsive)
cards.json        the database — a JSON array of cards
lib/              github.js (Contents API + safe-write), fsrs.js, ingest.js,
                  store.js, format.js, markdown.js, html.js
components/        Markdown.js, TagEditor.js
screens/          Review.js, Add.js, Browse.js, Settings.js
docs/adr/         architecture decision records
_config.yml       keeps cards.json + docs off the public Pages site (ADR-0006)
```

## Deploy

`git push` to `main`. GitHub Pages rebuilds and serves from the repo root.
