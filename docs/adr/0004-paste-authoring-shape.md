# 0004 — Cards are added by pasting authoring-shape JSON

The card-authoring skill is built and owned separately by the user; this repo
does not contain it. The contract between that skill and the web UI is a JSON
"authoring shape": the skill emits a card as

    { "question": "...", "answer": "...", "tags": [...], "source": "..." }

and the web UI's add-card flow accepts that pasted into a textbox. Only
`question` and `answer` are required; `tags` and `source` are optional. On
ingest the UI generates `id` and `created` and initializes the FSRS new-card
state (state "new", due today), so a pasted card is immediately reviewable.

The add box is tolerant: it accepts a single object or an array of objects
(batch paste), and parses JSONC (it strips `//` comments and trailing commas) so
the skill's commented output pastes without hand-editing.

## Why record this

Two independently built components must agree on this shape. If the UI later
renamed these fields or demanded strict JSON, it would silently break the
external skill. Pinning the field names and the leniency here is the
coordination point.

## Consequences

- The four authoring field names (`question`, `answer`, `tags`, `source`) are a
  stable public interface; do not rename them without updating the skill.
- The UI never trusts pasted scheduling fields. If a pasted card includes `due`,
  `stability`, etc., the UI ignores them and owns `id`, `created`, and all FSRS
  state itself.
