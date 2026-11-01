# Seed issues

These are the first issues to open, so that friends and followers who arrive have something real to
pick up. `pnpm setup:github` (see [NEXT_STEPS](../NEXT_STEPS.md)) creates them and skips any whose
title already exists, so it is safe to run twice.

Format, because a script reads this file: each issue is a `## Title` section. The first line is
`Labels: a, b, c` and the rest is the body. Use `###` for headings inside a body. Every label must
exist in `.github/labels.yml` (a test checks it).

Example projects below were checked against GitHub on 2026-11-01. They are ideas, not approvals.
CI and the reviewer still check each one, and GitHub shows licenses that can change.

## Add bricks: Systems, Kernel and Infrastructure (claim a batch)

Labels: type/brick, good first issue, help wanted, area/registry

Add open-source projects from the **systems** sector: operating systems, languages and compilers,
runtimes, networking, storage, virtualization, embedded and graphics.

### How to claim

Comment with the repositories you will add, for example "claiming nginx/nginx". Add one brick per
pull request. Follow `CONTRIBUTING.md`, section "Add a brick in 10 minutes".

### Ideas

- `nginx/nginx` (BSD-2-Clause)
- `zephyrproject-rtos/zephyr` (Apache-2.0)
- `bytecodealliance/wasmtime` (Apache-2.0)
- `llvm/llvm-project`: GitHub cannot classify it. Its `LICENSE.TXT` says Apache License v2.0 with LLVM
  Exceptions, so the SPDX expression is `Apache-2.0 WITH LLVM-exception`
- `nodejs/node`: GitHub cannot classify it, so read its `LICENSE` file yourself
- `golang/go` (BSD-3-Clause)

### Watch out for

Mirrors and forks of a listed project do not become bricks. If a project does the same job as a
listed one with a different trade-off, add it to that brick's `alternatives` instead.

## Add bricks: Frontend, Web and UI/UX (claim a batch)

Labels: type/brick, good first issue, help wanted, area/registry

Add open-source projects from the **frontend** sector: UI frameworks, component libraries, styling,
state and data fetching, build tools, 3D and graphics, data visualization, animation and mobile.

### How to claim

Comment with the repositories you will add. One brick per pull request. Follow `CONTRIBUTING.md`.

### Ideas

- `vuejs/core` (MIT)
- `sveltejs/svelte` (MIT)
- `angular/angular` (MIT)
- `storybookjs/storybook` (MIT)
- `d3/d3` (ISC)
- `pmndrs/react-three-fiber` (MIT)

### Watch out for

`pmndrs/react-three-fiber` is built on the listed `mrdoob/three.js`. That is a good candidate for
`compatibleWith`, but only add a relationship you can confirm in the project's documentation.

## Add bricks: Backend, APIs and Databases (claim a batch)

Labels: type/brick, good first issue, help wanted, area/registry

Add open-source projects from the **backend** sector: web frameworks, API tooling, databases, ORMs,
authentication, messaging, caching, workflows and serverless.

### How to claim

Comment with the repositories you will add. One brick per pull request. Follow `CONTRIBUTING.md`.

### Ideas

- `django/django` (BSD-3-Clause)
- `pallets/flask` (BSD-3-Clause)
- `nestjs/nest` (MIT)
- `apache/kafka` (Apache-2.0)
- `drizzle-team/drizzle-orm` (Apache-2.0)
- `valkey-io/valkey` (BSD-3-Clause)

### Watch out for

Several projects here are close alternatives of each other, such as Django and Flask. Each can be its
own brick if it makes a different trade-off. Say what the trade-off is in the pull request.

## Add bricks: AI, LLMs and Agent Harnesses (claim a batch)

Labels: type/brick, good first issue, help wanted, area/registry

Add open-source projects from the **ai** sector: machine learning frameworks, inference and serving,
LLM apps and orchestration, agents, MCP servers, vector search, evaluation and developer tools.

### How to claim

Comment with the repositories you will add. One brick per pull request. Follow `CONTRIBUTING.md`.

### Ideas

- `huggingface/transformers` (Apache-2.0)
- `langchain-ai/langchain` (MIT)
- `vllm-project/vllm` (Apache-2.0)
- `run-llama/llama_index` (MIT)
- `chroma-core/chroma` (Apache-2.0)
- `scikit-learn/scikit-learn` (BSD-3-Clause)

### Watch out for

Model weights are not software. Add the project that runs or trains models, not a model file. Young
projects in this area move fast, so CI will warn if a repository is under 30 days old or has under
100 stars, and reviewers will look closer.

## Add bricks: DevOps, Security and Tooling (claim a batch)

Labels: type/brick, good first issue, help wanted, area/registry

Add open-source projects from the **devops** sector: CI and CD, containers, infrastructure as code,
observability, security scanning, testing, linters, package managers and CLI tools.

### How to claim

Comment with the repositories you will add. One brick per pull request. Follow `CONTRIBUTING.md`.

### Ideas

- `opentofu/opentofu` (MPL-2.0)
- `argoproj/argo-cd` (Apache-2.0)
- `helm/helm` (Apache-2.0)
- `moby/moby` (Apache-2.0)
- `open-telemetry/opentelemetry-collector` (Apache-2.0)
- `aquasecurity/trivy` (Apache-2.0)
- `microsoft/playwright` (Apache-2.0)
- `astral-sh/ruff` (MIT)
- `BurntSushi/ripgrep` (Unlicense)

### A project that does not qualify

`hashicorp/terraform` cannot be a brick. Its `LICENSE` is the Business Source License, which is
source-available, not open source. The admission criteria require an open-source license. Notice that
GitHub shows `NOASSERTION` for it. If you are unsure, read the license file.

## Verify the 14 seed bricks, one each

Labels: needs-review, good first issue, area/registry

The first 14 bricks were written by the maintainer, with help from an AI tool, and checked against
GitHub. A second pair of human eyes is exactly what this project is about.

### What to do

1. Pick one file in `registry/bricks`. Comment which one you took, so nobody doubles up.
2. Open the repository it describes. Check, in your own words:
   - the **license** against the project's license file
   - the **one sentence** against its README: is it accurate, plain and free of hype?
   - the **category**, **tags** and **website**
   - any `compatibleWith` or `alternatives` entries
3. Comment with what you verified and anything you would change. A comment that names something
   specific counts as a review. "Looks good" does not.
4. If you found a mistake, send a pull request that fixes only that file.

### Why this matters

Reviews are the quality gate. This is also practice for the review rule: the lesser of 4 and the
number of open brick pull requests, before your own brick is merged.

## Add a JSON output format to `pnpm validate`

Labels: type/feature, good first issue, help wanted, area/registry

`pnpm validate` prints text, or GitHub annotations with `--format github`. Editors and bots would like
machine-readable output.

### Acceptance

- `pnpm validate --format json` prints one JSON object with `issues`, `bricks`, `errors` and
  `warnings`, and nothing else on stdout.
- Each issue has `severity`, `file`, `code`, `message` and, when known, `line` and `column`.
- The exit codes do not change: 0 ok, 1 errors, 2 bad usage.
- Output is stable: the same registry gives byte-identical output.
- The usage text and `registry/README.md` mention it.

### Where to start

`packages/registry/src/format.ts` and `packages/registry/src/cli.ts`. Tests go in
`packages/registry/src/format.test.ts` and `integration.test.ts`, in the table style already used.

### Watch out for

Messages contain text from contributors. JSON encoding handles quoting, but check that a message with
a newline, a quote and a non-ASCII character survives a round trip.

## Suggest a category in `pnpm brick:new` from GitHub topics

Labels: type/feature, help wanted, area/registry

`pnpm brick:new owner/repo` fills in tags from GitHub topics, but the category has to be chosen by
hand, or it stays `choose-a-category`. A hint would save newcomers a trip to the taxonomy.

### Acceptance

- When `--category` is not given, the command prints a suggestion such as
  `Suggested category: web-frameworks (from topics: web-framework, api)`.
- It only suggests. It never writes a category by itself.
- Suggestions only come from categories in the chosen sector.
- With no topics, no match or a tie, it says so and lists the sector's categories.

### Design question to settle first

Where does the topic-to-category mapping live? A small data file next to `registry/taxonomy.json` is
the likely answer, and it is maintainer-owned. Propose the format in the pull request description
before writing much code.

### Where to start

`packages/registry/src/scaffold.ts`. Its tests are in `integration.test.ts`.

## Write a fixture suite of broken manifests with the expected messages

Labels: good first issue, help wanted, area/registry

The validator's messages are the first thing a newcomer reads, so they have to be right. Collect the
mistakes real people make and check that each one gets a message that says what to do.

### Acceptance

- A table-driven test file with at least 40 broken manifests, each with the message fragment it must
  produce, for example the field name and the fix.
- Include realistic mistakes: curly quotes copied from a document, a trailing comma, tabs, a byte
  order mark, a Windows line ending, capital letters in the path, a `.JSON` extension, a number where
  a string belongs, an emoji in the name, a Markdown link in the sentence, a missing final period, a
  `techStack` with nine tags, and a copied example left unedited.
- If a mistake produces a confusing message, fix the message in `packages/registry/src/zod-messages.ts`
  in the same pull request.

### Where to start

`packages/registry/src/validate.test.ts` shows the helpers. Read `CONTRIBUTING.md` first, so you see
what a newcomer sees.

## Translate the 10 minute guide into Hindi

Labels: type/docs, good first issue, help wanted, area/docs

Many first-time contributors will be more comfortable in Hindi. Translate the section "Add a brick in
10 minutes" of `CONTRIBUTING.md`.

### Acceptance

- A new file `docs/translations/hi/add-a-brick.md`.
- The English file stays the source. Start the translation with a line that says so and links to it.
- Keep commands, file paths, field names and error codes in English.
- Write it yourself. Machine translation without a careful human edit does not meet the project's
  AI policy.
- `pnpm links` passes.

### Where to start

Read the English section twice, then try the steps yourself before you translate them.

## Spike: picking cost for 50,000 instances on a mid-range phone

Labels: type/spike, area/3d, help wanted, adr-needed

The monument will show up to 50,000 bricks as one instanced mesh. Finding the brick under a tap must
stay fast without checking every brick. `docs/decisions/0009-picking-and-transparency.md` lists the
candidates. This spike measures them. It is a written result, not production code.

### Deliverable

A small benchmark page and a table in the pull request, for 5,000 and 50,000 instances, on at least
one real mid-range phone and one laptop:

- the naive per-instance loop (the baseline)
- a voxel ray march over the slot lattice
- an instance BVH, such as the one in `@three.ez/instanced-mesh`

For each, report the median and 95th percentile time per pick, memory use and the amount of code.

### Out of scope

Choosing the winner. That is an ADR written from your numbers (use the `write-adr` skill). Do not add
the benchmark page to the production app.

## Design the Sponsor Step poster plates

Labels: type/feature, area/sponsors, help wanted

Sponsors will have their logo placed on a standard plate, so no sponsor can imitate our interface.
Design the neutral plates that forks and default builds show, in a light and a dark version.

### Acceptance

- SVG, 2:1 aspect ratio (the final tile is 512 by 256), no scripts, no external references, no
  embedded fonts or raster images.
- A clearly marked safe area of 80% where a logo will sit.
- Neutral placeholder content only. Use no real company's logo or trademark.
- Text contrast meets WCAG 2.2 AA.
- No motion of any kind.

### Read first

`docs/SPONSORSHIP.md`, section "Creative specification", and the draft spec in
`specs/003-grand-stairways-sponsor-steps/spec.md`. Your work is released under the repository's MIT
license.

## Write an accessibility test plan for the Architect Table View

Labels: type/docs, area/web, help wanted

Every 3D feature needs an accessible 2D equivalent, the Architect Table View, that meets WCAG 2.2
level AA (constitution principle IV). Write the plan that will be used to test it.

### Acceptance

- A new file `docs/accessibility-test-plan.md`.
- A table that maps each relevant WCAG 2.2 AA success criterion to a concrete test for a table of
  bricks, a category filter, search and a brick drawer.
- Keyboard-only and screen-reader scenarios, written as numbered steps a person can follow, for at
  least one screen reader on Windows and one on a phone.
- Reduced motion, 200% zoom, high contrast and text-only checks.
- Sponsors must appear once, in a labeled region, never between bricks.

### Not in scope

Writing code. The table does not exist yet.

## Review the scoring formula and try to break it

Labels: area/scoring, help wanted, needs-review

The Pyramid Score decides a brick's size tier at admission. Its constants are provisional until the
Seed 500 is calibrated. Read `docs/SCORING.md` and `packages/scoring`, then try to find inputs that give
a result that looks wrong.

### What to deliver

Either a pull request with a new test (passing or failing) that captures a surprise, or an issue that
gives the exact inputs, the score you got and the score you expected. Think about:

- very new repositories with a huge star count
- projects that are dormant but hugely popular
- repositories with issues turned off
- boundaries where a tier changes by 0.01

### Read first

The "Gaming and abuse" section of `docs/SCORING.md`. Fake stars buy at most 17.5 points. Is that true?

## Run the project on Windows, macOS and Linux and report what happens

Labels: good first issue, help wanted, area/ci

Most of the code was written on Windows. Help find what breaks elsewhere.

### What to do

On your machine, follow `CONTRIBUTING.md`, section "Work on the code locally":

1. `pnpm install`
2. `pnpm check`
3. `pnpm brick:new expressjs/express --sector backend` (then delete the file)
4. Open `README.md` in your editor and follow one link of each kind.

### Report

Comment with your operating system, Node.js version, what worked and exactly what failed, including
the full error text. If the problem is a path, a line ending or a character that does not display,
say so. Please do not paste any tokens or personal details.
