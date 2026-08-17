# SRS

A personal spaced-repetition system shared by a minimal web app and an MCP server. The repo itself is the database: every card and its FSRS schedule lives in [`cards.json`](cards.json), read and written safely through the GitHub Contents API. There is no hosted backend and the browser app has no build step.

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
5. Open the live app and paste the token once. The repository is already fixed in the app, so there is nothing else to configure.

The token is stored in your browser's `localStorage` and sent only to
`api.github.com`. When it expires the app shows a "token expired" banner — mint a
new one and re-paste. See [ADR-0005](docs/adr/0005-browser-auth-scoped-pat.md).

## Using it

- **Review** — every due card, then new cards. **Space** reveals the answer; **1–4** rate Again, Hard, Good, or Easy and show the next interval.
- **Add** — one question, one answer, optional source, and tag autocomplete that puts existing categories first.
- **Browse** — search with **/**, filter by tag, edit, or delete.
- **Navigate** — **R**, **A**, and **B** switch between Review, Add, and Browse. The shortcuts stay visible on screen.

Cards are authored in the shape `{ question, answer, tags?, source? }`; the app
owns `id`, `created`, and all FSRS state. See
[ADR-0004](docs/adr/0004-paste-authoring-shape.md).

## Connect an agent

The MCP server exposes ten small tools: list tags and cards, create one or many cards, update and delete cards, and run the full review loop without revealing an answer early. It uses the GitHub account already authenticated by `gh` and defaults to that account's `srs` repository.

```bash
gh auth login
npx --yes --package git+https://github.com/michelgrolet/srs.git srs-mcp
```

Codex and Claude Code can install the repository as a plugin through its `.codex-plugin`, `.claude-plugin`, and `.mcp.json` manifests. With TARS:

```bash
claude plugin marketplace add michelgrolet/tars
claude plugin install srs@tars
```

Set `SRS_GITHUB_REPOSITORY=owner/repo` only when the repository is not named `srs`. `SRS_GITHUB_TOKEN`, `GH_TOKEN`, and `SRS_GITHUB_BRANCH` are optional overrides.

## Develop locally

No toolchain. Serve the folder and open it:

```sh
python3 -m http.server 8011   # then open http://localhost:8011
```

The app talks to `api.github.com` regardless of origin (CORS allows it), so a
local copy reads and writes the same `cards.json` once you paste a token.
Dependencies are pinned ES modules loaded from a CDN via the import map in
[`index.html`](index.html) — nothing to install.

The MCP server uses Node 20+:

```bash
npm install
npm test
```

## Layout

```
index.html        entry + import map (every dependency pinned here)
app-v2.js         Preact shell: shortcuts, load, central safe-write, auth banner
styles-v2.css     atmospheric responsive interface
cards.json        the database — a JSON array of cards
lib/              github.js (Contents API + safe-write), fsrs.js, ingest.js,
                  store.js, format.js, markdown.js, html.js
components/       Markdown.js and tag autocomplete
screens/          review, add, and browse
server/           the MCP server, GitHub auth, and pure card operations
skills/           agent behavior for card creation and chat reviews
test/             domain and real stdio MCP tests
docs/adr/         architecture decision records
_config.yml       keeps cards.json + docs off the public Pages site (ADR-0006)
```

## Deploy

`git push` to `main`. GitHub Pages rebuilds and serves from the repo root.
