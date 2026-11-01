# Implementation Plan: Brick Registry

**Branch**: `001-brick-registry` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

## Summary

Registry data lives in plain files. A pure TypeScript library validates it, a small CLI runs the
library locally and in CI, and a generated JSON Schema gives editors hints. The design goal is that a
stranger can fix their own pull request from the message alone.

## Technical Context

| Item | Choice |
| :--- | :--- |
| Language | TypeScript 7 on Node.js 22, ESM |
| Libraries | Zod 4 (schema), `jsonc-parser` (positions), `spdx-expression-parse` and `spdx-license-ids` (licenses) |
| Storage | Files in `registry/`. No database |
| Testing | Vitest, table-driven, with a fake GitHub for the online checks |
| Target | A Node CLI now. The core has no I/O so it can run in a Worker or a browser later |
| Performance | 5,000 bricks in about 0.33 s, 50,000 in about 4.3 s (measured, near-linear) |
| Constraints | No network in the default path. GitHub trouble is never an error. Output must not be injectable |
| Scale | Epoch I is about 5,000 bricks. The ledger and manifests stay human-reviewable |

## Constitution Check

| Principle | How this feature complies |
| :--- | :--- |
| I. The registry is the product | Manifests hold facts only. Derived fields are rejected. The schema is published and generated |
| II. Contribution is the growth engine | Browser-only path, plain messages with line and column, scaffolder, docs validated by tests |
| III. Determinism and stability | Output is sorted and independent of file order. Ids are never reused. Registry paths are lowercase and stable |
| IV. Performance and access | Not applicable to the validator. Budgets for the monument arrive with the viewport spec |
| V. Test the logic, specify the rest | Every edge case in the spec maps to a test. 305 tests |
| VI. Security and trust boundaries | All manifest text is untrusted: limited, checked for hidden characters, escaped on output. Token is sent only to `api.github.com`. Git refs are validated. No `pull_request_target` |
| VII. Legal hygiene and honest branding | Registry data is CC0 with the official text. Licenses use deterministic SPDX rules, not an LLM |
| VIII. Simple, cheap and replaceable | No services. The GitHub client is an injected function. No abstraction without a second use |
| IX. Sponsorship never buys curation | Not applicable here. The ledger is maintainer-owned and sponsors have no path into it |

## Project Structure

```text
registry/
  bricks/<owner>/<repo>.json   community manifests (14 seeds)
  ledger.jsonl                 maintainer admission records
  taxonomy.json                sectors and categories
  schema/brick.schema.json     generated, never edited by hand
  LICENSE                      CC0 1.0 legal text
  README.md
packages/registry/src/
  schema.ts, zod-messages.ts   the Zod source of truth and plain-language messages
  json.ts, paths.ts            strict JSON with positions, path rules
  text-safety.ts, license.ts, website.ts   untrusted text, SPDX, URL checks
  taxonomy.ts, positions.ts    taxonomy lookup, offset to line and column
  validate.ts                  pure validation of a snapshot
  loader.ts, git.ts            files and git, the only impure adapters besides online.ts
  online.ts                    GitHub checks with an injected fetcher
  format.ts                    text, GitHub annotations, step summary
  scaffold.ts, cli.ts          pnpm brick:new and pnpm validate
  build-schema.ts              writes registry/schema/brick.schema.json
```

## Design Decisions

- **D-1 Zod is the source of truth.** The JSON Schema is generated, and `schema-sync.test.ts` fails if
  they drift. Hand-written schemas rot.
- **D-2 Validation is pure.** `validateRegistry(snapshot)` takes strings and returns issues. Loading
  files, git and the network live in adapters. The same code can later run in a Worker.
- **D-3 Strict JSON with positions.** A real parser reports duplicate keys and exact offsets. Zod
  issues are mapped to messages that name the field and the fix, never a raw schema path.
- **D-4 Errors are facts, warnings are opinions.** A wrong license is an error. Promotional wording,
  a young repository or any GitHub trouble is a warning, so heuristics and outages never block a
  contributor and humans make the judgment calls.
- **D-5 Online checks are defensive.** Injected fetcher, per-request timeout that covers the body,
  a request budget, stop on rate limit, token only to `api.github.com`, and the immutable GitHub id
  compared with the ledger so a taken-over name cannot inherit trust.
- **D-6 Output is escaped.** Workflow commands and Markdown summaries escape contributor text, so a
  manifest cannot inject a command or markup into CI.
- **D-7 Time zones.** Maintainers write local dates and CI runs in UTC, so the future-date check
  tolerates one day. A test locks the boundary.
- **D-8 Placeholders.** Only upper-case `TODO`, `TBD`, `FIXME` and the tag `replace-me` count, so a
  genuine to-do list project is not blocked.
- **D-9 Licenses.** `spdx-expression-parse` can throw raw `TypeError`s, so it is wrapped. Deprecated
  ids get the replacement named. GitHub's `NOASSERTION` is unverifiable, not wrong.
- **D-10 Taxonomy.** A category belongs to exactly one sector. Maintainers own the file and
  contributors request additions by issue. Version control was added when the seed set showed that
  Git had no home.

## Complexity Tracking

| Choice | Why it is justified |
| :--- | :--- |
| A custom message layer over Zod | Raw Zod messages fail the "stranger can fix it" test. The layer is one file |
| An injected fetcher | Makes every GitHub status code testable offline. It is a function type, not a framework |
| Separate ledger | Ids and impact cannot be community-owned without enabling self-rating and merge conflicts |

## Verified on the way

- Closed-form capacity tables were cross-checked by brute force (see ARCHITECTURE).
- Seed licenses were read from each repository's license files. Linux declares
  `GPL-2.0 WITH Linux-syscall-note`, Rust is `MIT OR Apache-2.0`, and PyTorch is the three-clause BSD.
- The official CC0 text was downloaded byte for byte and checked for every section.
