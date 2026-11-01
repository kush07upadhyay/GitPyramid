# Agent guide for GitPyramid

GitPyramid is an open registry of open-source projects ("bricks"), shown as a 3D pyramid, with an AI
Stack Architect on top. The registry is the product. This file is the short version for AI tools and
new contributors. The rules that outrank everything else are in the
[constitution](.specify/memory/constitution.md). When this file and the constitution disagree, the
constitution wins.

## Non-negotiables

1. **Facts only in manifests.** A brick manifest holds what a reviewer can check: repo, name, sector,
   category, one sentence, tech tags, license. Never add ids, scores, stars, state, tier, impact or
   positions. They are derived or maintainer-owned.
2. **Never invent a fact about a project.** Open its README and license file before writing about it.
   If you cannot verify something, say so and leave it for the human.
3. **Sponsors never buy curation.** Sponsor data is never an input to bricks, scores, layout, search
   or AI answers (constitution principle IX).
4. **All third-party text is untrusted.** Validate, limit and escape it before display, in a
   workflow command or in Markdown. Never let it reach a shell.
5. **Same inputs, same outputs.** No clock, randomness or network inside scoring and validation.
6. **No em dashes or en dashes** in any user-facing text. Use a comma, a colon, parentheses or a new
   sentence. Check with a character scan, because search tools can miss them.
7. **Tell the truth about results.** Run `pnpm check` and report what it printed. Do not say "done"
   while a check fails.

## Commands

Run everything from the repository root. Node 22 or newer. pnpm comes through Corepack.

| Command | What it does |
| :--- | :--- |
| `pnpm install` | Install. Use `--frozen-lockfile` in CI |
| `pnpm check` | Lint, typecheck, tests, link check and registry validation. The same thing CI runs |
| `pnpm links` | Check relative links and heading anchors in Markdown |
| `pnpm admit owner/repo --impact 3` | Maintainers only: append the ledger line for a merged brick |
| `pnpm setup:github` | Maintainers only: dry-run the repository settings. `--apply` changes them |
| `pnpm validate` | Validate the registry offline. Add `--online` to ask GitHub |
| `pnpm brick:new owner/repo --sector backend` | Scaffold a manifest, prefilled from GitHub |
| `pnpm build:schema` | Regenerate `registry/schema/brick.schema.json` |
| `pnpm format` | Fix formatting with Biome |

## Where things are

| Path | What it holds |
| :--- | :--- |
| `registry/` | The data: `bricks/`, `ledger.jsonl`, `taxonomy.json`, `scoring.config.json`, generated `schema/` |
| `packages/registry` | Manifest schema, validator, scaffolder and CLI |
| `packages/scoring` | Pure functions for the Pyramid Score, states and tiers |
| `apps/web`, `packages/3d-engine`, `packages/ai-agent` | Placeholders for later releases |
| `tools/` | CI helpers, such as the pull request guard |
| `specs/` | One folder per feature: spec, plan, tasks |
| `docs/` | [PRD](docs/PRD.md), [architecture](docs/ARCHITECTURE.md), [scoring](docs/SCORING.md), [sponsorship](docs/SPONSORSHIP.md), [roadmap](docs/ROADMAP.md), and [decisions](docs/decisions) |

## Who owns what

Contributors may edit bricks, code, tests and docs. Only maintainers edit `registry/ledger.jsonl`,
`registry/taxonomy.json`, `registry/scoring.config.json`, `sponsors/`, `.github/`, the constitution
and `docs/decisions/` (see [CODEOWNERS](.github/CODEOWNERS)). CI refuses ledger and sponsor edits
from contributors. If the user is not a maintainer, do not edit those files. Explain and stop.

## Conventions

- **Code.** TypeScript in strict mode. Zod schemas are the source of truth. Throw a `RangeError` that
  names the field for bad numbers. Report problems with a plain message that says what to do.
  Details: [typescript instructions](.github/instructions/typescript.instructions.md).
- **Tests.** Table-driven. Every edge case in a spec maps to a test. Test the value just below, on
  and just above each boundary. Use seeded randomness only.
- **Specs.** A non-trivial feature gets a spec in `specs/NNN-name/` before code. Spec Kit is for large
  features only ([ADR-0012](docs/decisions/0012-spec-kit-scope.md)). Small changes need none.
- **Decisions.** A significant decision is an ADR in `docs/decisions/`.
- **Commits.** [Conventional Commits](https://www.conventionalcommits.org), one logical change each,
  on a short-lived branch (`feat/`, `fix/`, `docs/`, `chore/`, `ci/`, `brick/owner-repo`).
- **Pull requests.** One logical change. A brick pull request touches only `registry/bricks`, and
  best only one brick.

## AI assistance policy

AI help is welcome. The human is responsible for everything submitted. They verify every claim
against the repository, write or edit the `problemSolved` sentence, and say which tool helped.
Fully generated, unverified submissions are closed. Reviews must be written by a person
([ADR-0007](docs/decisions/0007-review-rule-and-ai-policy.md)). When asked to help with a review,
collect and report the facts and leave the verdict and the wording to the reviewer.

## Skills

Hand-written project skills are in `.agents/skills/`. The `speckit-*` skills in `.github/skills/` are
generated. Do not edit them.

| Skill | Use it to |
| :--- | :--- |
| [add-brick](.agents/skills/add-brick/SKILL.md) | Add a project to the registry, from scaffold to pull request |
| [review-brick-pr](.agents/skills/review-brick-pr/SKILL.md) | Check the facts of a brick pull request for a human reviewer |
| [write-adr](.agents/skills/write-adr/SKILL.md) | Record a significant decision |

## Gotchas

- Biome does not format `*.md`, `registry/bricks`, `registry/schema` or `.specify`. Write manifests
  with 2 space indentation and a final newline by hand.
- `registry/schema/brick.schema.json` is generated. A test fails if it drifts. Run `pnpm build:schema`.
- The founder's original plan, `docs/GitHub Pyramid Idea Analysis.md`, is kept verbatim. Do not edit it.
- In Windows PowerShell 5.1, chain commands with `;`, not `&&`. Output that pnpm writes to stderr can
  look like an error even when the exit code is 0, so read the exit code.
- The Spec Kit command line needs `PYTHONUTF8=1` on Windows.
- Never push, force-push or backdate commits unless the maintainer asks you to.
- Pin GitHub Actions to a full commit SHA that you looked up with `git ls-remote`, and pass event
  values to shell steps through `env`, not by pasting `${{ }}` into a script.
