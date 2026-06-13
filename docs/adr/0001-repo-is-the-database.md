# 0001 — The GitHub repo is the database

The SRS web app is hosted on GitHub Pages, which is static-only: no server, no
database. Rather than add a managed backend, we store all cards and their review
schedule as a versioned file inside this same private repo. The web app reads it
over the GitHub API and writes changes back the same way (using a fine-grained
personal access token the user pastes into the browser once); the card-authoring
skill writes to the same file from the user's machine.

## Considered Options

- **Repo-as-database (chosen)** — Free forever, never sleeps, every change is a
  git commit (full history and backup), and the web UI and the authoring skill
  share one identical store with no glue. Cost: the browser holds a scoped
  GitHub token, and the app must use fetch-before-write with retry so sequential
  multi-device use cannot clobber state.
- **Firebase / Firestore (rejected)** — Best-in-class realtime cross-device
  sync, but adds a second service, Google lock-in on the card data, and NoSQL —
  unjustified for a single user whose multi-device use is sequential, not
  simultaneous.
- **Supabase (rejected)** — Free tier pauses a project after 7 days of
  inactivity, which is fatal for a tool whose whole purpose is to call you back
  after long gaps.
- **Browser-only (localStorage / IndexedDB) (rejected)** — Simplest, but data is
  single-device with no sync and no backup, and the authoring skill could not
  write into the same store.

## Consequences

- Review progress must live in the shared repo file, not per-browser, so any
  device sees the latest schedule on load.
- Writes go through the GitHub Contents API, which enforces optimistic
  concurrency (a write must target the current file SHA); the app re-fetches and
  re-applies its changes on conflict.
