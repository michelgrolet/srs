# 0003 — No build step; dependencies loaded from a CDN

The web app ships as plain files (HTML + JS) committed to the repo and served by
GitHub Pages as-is. There is no bundler, no `node_modules`, and no CI build.
Third-party libraries (Preact + htm for the UI, `ts-fsrs` for scheduling) are
imported as ES modules directly from a CDN at runtime.

This is a deliberate deviation from the usual Vite / React + GitHub Action
pipeline. For a roughly four-screen single-user tool, a toolchain adds dependency
rot, a build to maintain, and a deploy pipeline, with no payoff. The stance: the
files we write are the files that run, deploy is `git push`, and the app should
still work untouched in five years.

## Considered Options

- **No build, CDN ES modules (chosen)** — zero toolchain, permanent, deploy by
  push.
- **Vite + React + GitHub Action (rejected)** — best developer experience at
  scale, but overkill and a maintenance tax for an app this small.

## Consequences

- Pin every CDN import to an exact version so the app is reproducible and cannot
  break under us when a library publishes a new release.
- No JSX; the UI uses `htm` tagged templates (JSX-like, parsed at runtime, no
  compile).
- The app needs connectivity to load its libraries and to read/write the data
  file. Offline review is out of scope for now; a service worker could cache the
  app shell later if it matters.
