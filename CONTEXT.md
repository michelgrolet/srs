# SRS — Spaced Repetition System

A personal spaced repetition system: a private tool that resurfaces facts you
want to remember, at expanding intervals timed to just before you would forget
them.

## Language

**Card**:
The atomic unit you study: one Question and the single Answer it should trigger.
One card tests one fact.
_Avoid_: flashcard, note, item

**Question**:
The prompt side of a card, shown first. May contain markdown.
_Avoid_: front, prompt, cue

**Answer**:
The recall side of a card, revealed after you have tried to remember. May
contain markdown.
_Avoid_: back, response, solution

**Review**:
A single act of being shown a card's prompt, recalling the answer, then
revealing it and rating how well you remembered.
_Avoid_: test, quiz, attempt

**Rating**:
Your self-assessment at the end of a review (how easily the answer came), which
feeds the scheduler.
_Avoid_: score, grade, mark

**Due**:
The date a card is next scheduled to be reviewed. A card is "due" when that date
has arrived or passed.
_Avoid_: scheduled, next-up

**Tag**:
A free-form label on a card; a card may carry several. A review session draws
from all due cards by default, or only those matching a chosen tag. Tags are the
only grouping mechanism; there are no fixed folders.
_Avoid_: deck, category, folder, collection

**Source**:
Optional note on a card recording where the fact came from (a document, a URL, an
ADR). Provenance only; never shown during recall.
_Avoid_: reference, origin, citation
