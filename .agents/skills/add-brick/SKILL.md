---
name: add-brick
description: 'Add an open-source project to the GitPyramid registry as a brick. Use when someone wants to add, suggest, submit or list a repository, create or fix a manifest in registry/bricks, asks how to contribute a project, or hits a validation message about a brick. Walks from picking the project to the pull request.'
argument-hint: 'owner/repo of the project to add'
---

# Add a brick

A brick is one open-source project, described by one small JSON file. Read
[CONTRIBUTING](../../../CONTRIBUTING.md#add-a-brick-in-10-minutes) for the contributor view and
[the brick instructions](../../../.github/instructions/registry-bricks.instructions.md) for the field rules.

## Ground rules for you, the assistant

- **Never state a fact you did not see.** Every claim in the manifest must come from the repository
  (README, license file, GitHub page). Note where you saw it.
- **You may draft. The human verifies.** The policy ([ADR-0007](../../../docs/decisions/0007-review-rule-and-ai-policy.md))
  rejects unverified generated submissions. After drafting, show the user each claim with its
  evidence and ask them to confirm it. The `problemSolved` sentence should end up in their words.
- **Do not touch** `registry/ledger.jsonl`, `registry/taxonomy.json` or any derived value. Maintainers
  add the ledger line after the brick is merged.

## Procedure

1. **Check the project is eligible.** It is public, open source, not archived, not a template and not
   a mirror, and it has a README. Search `registry/bricks` for it first. If it is already listed, stop.
   If it only offers a different trade-off, it may belong in an existing brick's `alternatives`.
2. **Find the exact name GitHub shows today.** Renamed projects redirect (`facebook/react` is now
   `react/react`). The manifest and file path use the current lowercase name.
3. **Scaffold it.**
   ```bash
   pnpm brick:new owner/repo --sector backend --category web-frameworks
   ```
   Sectors: `systems`, `frontend`, `backend`, `ai`, `devops`. Categories are in
   `registry/taxonomy.json`. If none fits, open a taxonomy request issue and stop.
4. **Fill the human fields.**
   - `problemSolved`: one plain sentence, 20 to 160 characters, ends with a period, says what problem
     it solves. No links, markup, hype or long dashes.
   - `techStack`: 1 to 8 lowercase tags for the real technologies.
   - `license`: confirm against the repository's license file. If GitHub shows `NOASSERTION`, read the
     file yourself and say so in the pull request.
   - `website`: only the project's own `https` site.
   - `compatibleWith`, `alternatives`: only bricks that already exist, and only if you know the
     relationship is true.
5. **Validate.**
   ```bash
   pnpm validate --online
   ```
   Fix errors. Warnings (young repository, few stars, `NOASSERTION`) are for the reviewer, so mention
   them in the pull request.
6. **Open the pull request** from a branch named `brick/owner-repo`.
   - Title: `feat(registry): add owner/repo`.
   - It changes only `registry/bricks/owner/repo.json`. CI refuses mixed changes.
   - Fill the template. Say which AI tool helped, if any.
   - Review the lesser of 4 and the number of other open brick pull requests, and list the links with
     one specific finding each ([the review rule](../../../GOVERNANCE.md#the-review-rule-4-for-1)).
     The `review-brick-pr` skill helps gather facts. The author writes the words.
   - If you own or work on the project, say so. Another person must approve it.

## Common validation messages

| Code | Meaning | Fix |
| :--- | :--- | :--- |
| `PLACEHOLDER`, `TEXT_PLACEHOLDER` | A template value is still there | Replace `owner/repo`, the TODO sentence and the `replace-me` tag |
| `DERIVED_FIELD` | You added a score, id, stars and so on | Delete it. It is computed |
| `CATEGORY` | The category belongs to another sector | Use one of the sector's categories |
| `LICENSE`, `LICENSE_MISMATCH` | Not a valid SPDX id, or it differs from GitHub | Copy the id from the license file |
| `RENAMED` | GitHub moved the repository | Use the new name for the file and the `repo` field |
| `UNKNOWN_REFERENCE` | `compatibleWith` or `alternatives` names a missing brick | Remove it, or add that brick first |
| `MIXED_CHANGE`, `BRICK_REMOVAL` | The pull request changes more than one brick file | Send a separate pull request. Maintainers handle removals |

## Done when

`pnpm validate --online` has no errors, the user confirmed every claim, and the pull request text
names the reviews and any AI help.
