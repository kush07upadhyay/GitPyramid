---
description: "Use when adding or editing a brick manifest in registry/bricks, writing problemSolved text, choosing a category, license or tags, or answering a contributor's question about a brick. Covers what to write, what never to write and how to check it."
applyTo: "registry/bricks/**"
---
# Brick manifests

- One file per project at `registry/bricks/<owner>/<repo>.json`, all lowercase. Use the name GitHub
  shows now (`facebook/react` is `react/react`). The `repo` field must match the path.
- Start with `pnpm brick:new owner/repo --sector backend`. It fills in what GitHub knows and leaves
  the rest as placeholders that validation rejects.
- Write only facts a reviewer can check. Never add an id, score, state, stars, impact, tier or
  position. The ledger is maintainer-owned and CI refuses edits to it.
- `problemSolved` is one plain sentence of 20 to 160 characters that ends with a period and says what
  problem the project solves. No links, markup, hype, em dashes or en dashes. Write it from the
  project's README, not from memory.
- `license` is an SPDX id or expression such as `MIT OR Apache-2.0`. Read the repository's own
  license file. GitHub reports `NOASSERTION` for some projects (the Linux kernel, Git, PyTorch).
- `category` must belong to the chosen sector in `registry/taxonomy.json`. If none fits, open a
  taxonomy request issue. Do not invent a category.
- `compatibleWith` and `alternatives` may only name bricks that already exist. List a relationship
  only if you know it is true.
- Run `pnpm validate --online` before committing. Warnings are for a human reviewer. Errors block.
- Keep the pull request to this one file. Do not mix a brick with code or doc changes.
- If an AI tool helped, the human still verifies every claim and says so in the pull request.
