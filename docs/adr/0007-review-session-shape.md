# 0007 — Review-session shape

The brief fixed the review screen's inputs ("all due cards plus up to N new
cards") but left three operational details open. They shape day-to-day behaviour
and are awkward to change once the user has habits built around them, so we pin
them here.

## Decisions

1. **"Due" is an exact timestamp, not a calendar day.** A card is due when
   `due <= now` (to the millisecond). FSRS schedules early reviews in minutes
   (learning steps of ~1m / 6m / 10m) and later ones in days; one timestamp test
   handles both uniformly. Comparing on calendar day would make minute-scale
   learning steps meaningless.

2. **The new-card limit is per session, not a per-calendar-day quota.** A session
   pulls every due non-new card (no cap) and at most N new cards, where N is the
   Settings "daily new-card limit" (default 20). We do **not** persist a
   per-day counter of how many new cards were introduced; N simply caps how many
   `new` cards a session surfaces. Once a new card is reviewed it leaves the
   `new` state, so the remaining-new count falls naturally. This avoids storing
   review-history bookkeeping in `cards.json` just to enforce a daily quota.

3. **The queue is frozen when the session starts.** On entering Review we build
   an ordered list of card ids — most-overdue first, then new cards in creation
   order — and walk it with a pointer; rating advances the pointer. Cards that
   become due again mid-session (e.g. a learning card rated *Again*, now due in
   1m) do **not** silently re-inject into the current list. The user gets them by
   starting another session — the All-done screen offers "Start another session"
   when more cards have come due, and re-entering Review rebuilds the queue.

## Consequences

- The data file needs no session/day state; the schedule is derivable purely
  from each card's FSRS fields plus the current time.
- Raising or lowering the daily limit takes effect on the next session with no
  migration.
- Because the queue is frozen, a long session won't loop on a card the user
  keeps rating *Again* within the same sitting; that card returns next session.
  If immediate re-drilling of lapses is wanted later, it's a localized change to
  the queue logic in `screens/Review.js`, not a data-model change.
