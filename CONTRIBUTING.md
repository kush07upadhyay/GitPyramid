# Contributing to GitPyramid

Thank you for helping. The fastest way to make a real difference is to **add a brick**. It takes
about 10 minutes, needs only a web browser, and CI tells you exactly what to fix.

By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help

| Effort | What | Start here |
| :--- | :--- | :--- |
| 10 min | Add a brick | [Add a brick](#add-a-brick-in-10-minutes) |
| 5 min | Suggest a brick without writing JSON | [Suggest a brick](https://github.com/kush07upadhyay/GitPyramid/issues/new/choose) |
| 15 min | Review someone else's brick pull request | [Review rule](#the-review-rule) |
| 5 min | Fix a wrong category, description or link | Edit the brick file, open a pull request |
| 30 min | Improve docs, fix typos, translate | Issues labeled `type/docs` |
| 1 hr+ | Tests, validator, scoring, tooling | Issues labeled `good first issue` or `help wanted` |
| Large | 3D, layout, AI, sponsors | Read the [PRD](docs/PRD.md) and [roadmap](docs/ROADMAP.md), then open a discussion first |
| 1 min | Star the repo, share it | The buttons at the top of the page |

## Add a brick in 10 minutes

A **brick** is one open-source project in the registry. You add it with one small JSON file.

### 1. Pick a project

It should be public, open source, not archived, and not already listed. Search the
[`registry/bricks`](registry/bricks) folder for its name first. Do not submit a mirror, a template or
a clone of a listed project (if it is a real alternative, add it to the listed brick's
`alternatives` instead).

### 2. Create the file

Use the browser. No Git needed.

1. Open [this link](https://github.com/kush07upadhyay/GitPyramid/new/main?filename=registry/bricks/owner/repo.json&value=%7B%0A%20%20%22%24schema%22%3A%20%22..%2F..%2Fschema%2Fbrick.schema.json%22%2C%0A%20%20%22schemaVersion%22%3A%201%2C%0A%20%20%22repo%22%3A%20%22owner%2Frepo%22%2C%0A%20%20%22name%22%3A%20%22Display%20Name%22%2C%0A%20%20%22sector%22%3A%20%22backend%22%2C%0A%20%20%22category%22%3A%20%22web-frameworks%22%2C%0A%20%20%22problemSolved%22%3A%20%22TODO%3A%20one%20plain%20sentence%20about%20the%20problem%20this%20project%20solves.%22%2C%0A%20%20%22techStack%22%3A%20%5B%22replace-me%22%5D%2C%0A%20%20%22license%22%3A%20%22MIT%22%0A%7D%0A) to
   open the editor with a template. If it does not prefill, use **Add file, Create new file** in the
   `registry/bricks` folder and paste the template below. GitHub will offer to fork the repository
   for you. Accept.
2. Change the **file name** to `registry/bricks/<owner>/<repo>.json`, all lowercase. For
   `https://github.com/fastapi/fastapi` it is `registry/bricks/fastapi/fastapi.json`.
3. Fill in the fields (guide below).
4. Click **Commit changes**, choose **Create a new branch** and **Propose changes**, then **Create
   pull request**.

The template:

```json
{
  "$schema": "../../schema/brick.schema.json",
  "schemaVersion": 1,
  "repo": "owner/repo",
  "name": "Display Name",
  "sector": "backend",
  "category": "web-frameworks",
  "problemSolved": "TODO: one plain sentence about the problem this project solves.",
  "techStack": ["replace-me"],
  "license": "MIT"
}
```

A finished example (`registry/bricks/fastapi/fastapi.json`):

```json
{
  "$schema": "../../schema/brick.schema.json",
  "schemaVersion": 1,
  "repo": "fastapi/fastapi",
  "name": "FastAPI",
  "sector": "backend",
  "category": "web-frameworks",
  "problemSolved": "Builds typed web APIs in Python with automatic validation and interactive OpenAPI documentation.",
  "techStack": ["python", "asgi", "pydantic"],
  "license": "MIT",
  "website": "https://fastapi.tiangolo.com"
}
```

### 3. Field guide

| Field | Required | Rules |
| :--- | :--- | :--- |
| `repo` | yes | Lowercase `owner/repo`. Must match the file path. |
| `name` | yes | The project's display name, up to 60 characters, plain text. |
| `sector` | yes | One of `systems`, `frontend`, `backend`, `ai`, `devops`. |
| `category` | yes | A category of that sector. See [`registry/taxonomy.json`](registry/taxonomy.json). None fits? [Request one](https://github.com/kush07upadhyay/GitPyramid/issues/new/choose). |
| `problemSolved` | yes | One plain sentence, 20 to 160 characters, ending with a period. What problem does it solve? No links, no markup, no dashes (use a hyphen or two sentences), no hype. |
| `techStack` | yes | 1 to 8 lowercase tags such as `python`, `rust`, `webgl`. |
| `license` | yes | The [SPDX](https://spdx.org/licenses/) id GitHub shows, for example `MIT`, `Apache-2.0`, `GPL-3.0-only`. Combinations like `MIT OR Apache-2.0` are fine. |
| `website` | no | An `https` link to the project's site. |
| `compatibleWith` | no | Up to 12 `owner/repo` entries that already have bricks and work well with this one. |
| `alternatives` | no | Up to 8 `owner/repo` entries that already have bricks and do a similar job. |

**Do not add** stars, scores, states, ids, positions or an impact level. They are computed or set by
maintainers, and CI will say so if you try.

Good `problemSolved`: "Builds typed web APIs in Python with automatic validation and interactive OpenAPI documentation."
Not good: "The BEST framework ever!!! See https://example.com" (hype, link, no clear problem).

### 4. Read what CI says

CI runs when you open the pull request. Each message names the file and line and says what to do.
To fix it, open your pull request, use **Files changed**, open the three-dot menu on your file and
choose **Edit file**.

| CI mentions | It usually means | Fix |
| :--- | :--- | :--- |
| path | The file name does not match `repo` | Rename to `registry/bricks/<owner>/<repo>.json`, lowercase |
| JSON | A typo such as a trailing comma or a missing quote | Look at the line number shown |
| category | Not a category of your sector | Pick one from the taxonomy, or request one |
| problemSolved | Wrong length, no period, a link or a dash, or still says TODO | Rewrite as one plain sentence |
| techStack | Still says `replace-me`, or has more than 8 tags | List the real technologies, lowercase |
| license | Not a valid SPDX id, or it differs from what GitHub shows | Copy the id from the repository page |
| repository | Not found, private, archived, or renamed | Use the exact name GitHub shows, or pick another project |
| compatibleWith or alternatives | Names a repo that has no brick yet | Remove it, or add that brick first |
| MIXED_CHANGE | The pull request changes other files besides the brick | Keep it to `registry/bricks`, and send the rest as its own pull request |
| MAINTAINER_ONLY | You changed the ledger, a sponsor file or a license file | Remove it. A maintainer adds the ledger line after your brick is merged. If you think a license is wrong, open an issue |
| BRICK_REMOVAL | You deleted or renamed a brick that is already listed | Open a bug report that names the brick. Maintainers handle it, because the ledger changes too |
| MANY_BRICKS or TOO_MANY_BRICKS | The pull request has several bricks | One brick per pull request is best. More than 5 is refused |

### 5. Review other pull requests

See [the review rule](#the-review-rule). Then wait for a maintainer. Reviews are usually quick. If
nothing happens for a few days, say so politely in a comment.

## The review rule

Before your brick is merged, **review the lesser of 4 and the number of other open brick pull
requests**, and list the links in a comment on your pull request. At launch there may be fewer than
four. Review them all. A review counts when it says something specific:

- You opened the repository and confirmed the license, activity and description.
- You found a mistake, a better category, a missing alternative or a duplicate.
- You can explain in a sentence why the brick belongs, or does not.

"Looks good" and bare approvals do not count. The full rule is in [GOVERNANCE](GOVERNANCE.md#the-review-rule-4-for-1).

## Work on the code locally

You need Node.js 22 or newer and Git. pnpm comes through Corepack.

```bash
corepack enable
pnpm install
pnpm check        # lint, typecheck, tests, link check and registry validation
pnpm validate     # only the registry
pnpm brick:new expressjs/express --sector backend --category web-frameworks
```

`pnpm format` fixes formatting. Use `pnpm validate --online` to also check the repositories against
GitHub. Set `GITHUB_TOKEN` in your environment to avoid rate limits.

## Branches, commits and pull requests

- Contributors do not push to this repository. Fork it, make a branch in your fork and open a
  pull request. Nothing reaches `main` or any other branch here until a maintainer merges it.
  Checks on a pull request from a fork start after a maintainer approves them, so the first checks
  can take a little while.
- Work on a branch, not on `main`. Names: `feat/`, `fix/`, `docs/`, `chore/`, `ci/`, and
  `brick/<owner>-<repo>` for bricks.
- Use [Conventional Commits](https://www.conventionalcommits.org): `feat(registry): add
  expressjs/express`, `fix(scoring): clamp negative ages`, `docs: explain epochs`.
- Keep a pull request to one logical change. Do not mix a brick with code changes.
- The title becomes the squash-merge commit, so write it as a Conventional Commit.
- Fill in the pull request template. It asks for the review links and AI disclosure.

## Larger changes

Open a discussion or an issue first. A non-trivial feature needs a short written spec in
`specs/NNN-name/` (the [Spec Kit](https://github.github.io/spec-kit/) templates are recommended but
optional) and any significant decision becomes an ADR in [`docs/decisions`](docs/decisions). The
[constitution](.specify/memory/constitution.md) has the rules every change must follow.

## Using AI tools

Welcome, with rules. You are responsible for everything you submit.

- Check every claim against the repository yourself. Write or edit the `problemSolved` sentence.
- Say in the pull request which tool you used.
- Fully generated, unverified submissions are closed, and so are AI-written reviews.
- Using Copilot or another assistant in this repository? It reads [AGENTS.md](AGENTS.md) and the
  skills in `.agents/skills`. The `add-brick` skill walks through the steps above.

## What we close

Unverified generated submissions, undisclosed self-promotion, duplicates, repositories that fail the
[admission criteria](GOVERNANCE.md#admission-criteria-v1), and changes whose only effect is to touch a
file (whitespace, rewording without a reason). This is about keeping reviewers' time for real work.

## Licensing of your contribution

Code and docs are MIT. Registry data (`registry/`) is CC0. By contributing you agree that your
contribution is licensed under the license of the files you change. There is no contributor license
agreement and no sign-off. Do not submit code or text you do not have the right to share.

## Credit

Your commits and pull requests are your credit in the repository history. A contributors wall that
is generated from merged pull requests is planned.

## Questions

Ask in [Discussions](https://github.com/kush07upadhyay/GitPyramid/discussions). See also
[SUPPORT](SUPPORT.md).
