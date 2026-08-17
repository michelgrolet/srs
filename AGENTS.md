# SRS setup

This repository is a template. Never store a user's real cards in `michelgrolet/srs`.

When a user asks for their own SRS:

1. Create a private repository from `michelgrolet/srs`, normally named `srs`.
2. If their repository has another name, write `{ "repository": "owner/repo" }` to `~/.config/srs/config.json`.
3. Install the plugin or MCP in the requested agent hosts.
4. Call `list_tags` through the installed MCP and confirm it reads the new repository.
5. Keep the public template's `cards.json` limited to the three synthetic cards whose source is `SRS demo`.

The GitHub Pages site is explicitly a demo. Without a token, all changes remain in browser memory and reset on reload. A clone's Pages URL automatically selects that clone's repository.
