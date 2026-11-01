# Registry

The registry is the product. Every brick in the pyramid is a file in this folder, and every file is
plain, reviewable data that anyone can read, fork or reuse. The data is dedicated to the public
domain under [CC0 1.0](LICENSE). The code that validates it lives in
[`packages/registry`](../packages/registry) and is MIT licensed.

## Who owns what

| Path | Owner | What it holds |
| :--- | :--- | :--- |
| [`bricks/<owner>/<repo>.json`](bricks) | Community | One manifest per project: facts a reviewer can check. |
| [`ledger.jsonl`](ledger.jsonl) | Maintainers | Admission records: id, impact level, who admitted it. Append only. |
| [`taxonomy.json`](taxonomy.json) | Maintainers | The five sectors and their categories. |
| [`schema/brick.schema.json`](schema/brick.schema.json) | Generated | JSON Schema for editor hints. Never edit by hand. |
| `scoring.config.json` | Maintainers | Score constants. Arrives with the scoring package. |

Stars, scores, states, sizes and positions are **never committed**. They change daily or depend on
every other brick, so they are computed at build time from live GitHub data.

## Add a brick

Follow the ten minute guide in [CONTRIBUTING](../CONTRIBUTING.md#add-a-brick-in-10-minutes). Short
version:

```bash
pnpm install
pnpm brick:new expressjs/express --sector backend --category web-frameworks
# edit registry/bricks/expressjs/express.json: write the problemSolved sentence
pnpm validate --online
```

Express is only an example. Swap in your own project. If it is already listed, the command says so.

`pnpm brick:new` looks the project up on GitHub and fills in what it can. What it cannot know, the
one sentence about the problem the project solves, it leaves as an obvious placeholder that
validation rejects.

## Check your work

```bash
pnpm validate                # offline, instant
pnpm validate --online       # also asks GitHub: public, not archived, license matches
```

Every message names the file and line and says what to do. Messages come in two kinds:

- **error**: must be fixed before the pull request can merge.
- **warning**: a human reviewer will look closer. Network trouble and GitHub rate limits are always
  warnings, so an outage never blocks you.

## The ledger

One JSON object per line. Contributors never edit this file. A maintainer appends a line when a
brick is merged. Existing lines never change, except that an Epoch migration may fill in `tier` as a
reviewed pull request with a public diff.

```json
{"id":2,"repo":"torvalds/linux","githubId":2325298,"admitted":"2026-11-01","by":"kush07upadhyay","impact":5}
```

| Field | Meaning |
| :--- | :--- |
| `id` | The brick number. Counts 1, 2, 3 with no gaps. Never reused, even if a brick is retired. |
| `repo` | Lowercase `owner/repo`. Must match a file in `bricks/` unless the entry is retired. |
| `githubId` | GitHub's immutable repository id. If a repository name is later taken over by a different project, the check against this id catches it. |
| `admitted` | Date of admission, `YYYY-MM-DD`. |
| `by` | GitHub login of the maintainer who admitted it. |
| `impact` | 1 to 5, from the rubric in [docs/SCORING.md](../docs/SCORING.md#impact-rubric). Maintainers set it, so nobody can rate their own project. |
| `tier`, `incubating`, `retired` | Optional. Size tier at admission, a flag for young projects, and a flag for removed bricks. |

Brick #1 is GitPyramid itself, rated 1 (emerging) on purpose: the founder's own project does not get
a thumb on the scale.

## The first bricks

The first set of 14 follows the founding plan's list (Linux, Git, React, Next.js, three.js, FastAPI,
PyTorch, Supabase, Rust) plus Kubernetes, Prometheus, Tailwind CSS and Ollama, so that all five
sectors have something in them. Ten licenses match what GitHub detects (Rust matches one half of its
dual license, which its COPYRIGHT file confirms). GitHub cannot classify the other four: Linux, Git
and PyTorch, whose license files were read directly, and GitPyramid, which GitHub will detect after
the first push. The online check reports a warning for those four. That is expected.

The long seed list of 500 follows in a later release, with the same one file per brick.
