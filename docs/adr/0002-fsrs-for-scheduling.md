# 0002 — FSRS for scheduling

We schedule reviews with FSRS (Free Spaced Repetition Scheduler) via the
`ts-fsrs` library, loaded as an ES module from a CDN so the app keeps its
no-build setup. FSRS fits a per-card memory model and needs meaningfully fewer
reviews than the classic SM-2 for the same retention, which compounds over years
of daily use. We accept that its model is less hand-inspectable than SM-2's plain
ease-factor formula, and that it adds one external (CDN-loaded) dependency.

## Consequences

- Each card carries FSRS state: `stability`, `difficulty`, `due`,
  `last_review`, `state` (new / learning / review / relearning), `reps`,
  `lapses`. This is the per-card shape the data file must hold.
- A future switch away from FSRS would require migrating or re-deriving this
  state from review history.
