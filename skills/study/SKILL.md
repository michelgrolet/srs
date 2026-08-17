---
name: study
description: Use when the user wants to remember, learn, revise, make flashcards, add or edit a card, see due cards, or review from chat.
---

# Study with SRS

Use the SRS MCP tools. Keep the interaction short.

This plugin reads the user's own repository. The public `michelgrolet/srs` repository is a template and demo, never their personal stack. If their repository is not named `srs`, configure it once in `~/.config/srs/config.json` as `{ "repository": "owner/repo" }`.

## Creating cards

1. Call `list_tags` first.
2. Make atomic cards: one precise question and the shortest complete answer.
3. Reuse an existing tag when it fits. A new tag is a deliberate choice, never a synonym invented for variety.
4. Use `create_card` for one card and `create_cards` for several.
5. If the tool rejects an unknown tag, choose from the returned existing tags or retry with `allow_new_tags: true` only when the category is genuinely new.

## Reviewing in chat

1. Call `get_review_card`, optionally with the exact tag the user named.
2. Show only the question and wait for the user's answer.
3. Call `reveal_card`, compare their answer plainly, and ask for or infer one rating: `again`, `hard`, `good`, or `easy`.
4. Call `rate_card` before moving to the next question.
5. Stop when `get_review_card` returns `done: true` or when the user stops.

Never reveal an answer before the user has tried. Never rate a card that was not revealed.
