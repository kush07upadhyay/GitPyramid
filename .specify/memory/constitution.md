# GitPyramid Constitution

## Core Principles

### I. The Registry Is the Product

Curated brick manifests in `registry/bricks/` are the single source of truth. The 3D layout, scores,
search index, badges and AI answers are derived from them and MUST be rebuildable from the registry
and the config files alone.

- A manifest MUST hold only human-curated facts. Volatile or derived values (stars, scores, state,
  slot coordinates, brick ids) MUST NOT be stored in a manifest.
- Every manifest MUST validate against the published JSON Schema before it can be merged.
- The repository MUST NOT contain third-party source code. It stores metadata and links only.

Rationale: reviewers can only check facts. Mixing facts with live numbers causes merge conflicts,
fake data and noisy history.

### II. Contribution Is the Growth Engine

- A first-time contributor MUST be able to add a brick using only the GitHub web editor, guided by CI
  messages written in plain language.
- Every pull request that adds or changes a brick MUST follow the 4-for-1 review rule in
  `GOVERNANCE.md`. A review MUST point out something specific. "Looks good" does not count.
- Fully AI-generated submissions that a human has not verified MUST be rejected. AI assistance is
  welcome when a human checked every claim and takes responsibility for it.
- Contributor docs and CI error messages are part of the feature. A change is not done until they
  match the new behavior.

Rationale: quality is the moat. The project grows only if contributing is easy and spam is expensive.

### III. Determinism and Stability

- Builds MUST be reproducible. The same registry and config MUST produce byte-identical output.
  Randomness MUST be seeded with a fixed value.
- Published identifiers (brick ids, `/brick/<owner>/<repo>` URLs, badge URLs, stack permalinks) MUST
  stay valid. Moving or renaming one needs a redirect and an ADR.
- A layout change MUST NOT silently move bricks that people have already linked to or shared. New
  bricks are appended. Existing bricks move only through an explicit, reviewed migration.

Rationale: people share screenshots and links. A monument that rearranges itself breaks trust.

### IV. Performance and Access Are Features

- The monument MUST render in at most 3 draw calls and hold 60 FPS on mid-range mobile GPUs, with the
  device pixel ratio capped at 1.5.
- The compiled manifest at 50,000 bricks MUST stay under 600 KB over the wire.
- Every 3D capability MUST have a keyboard and screen-reader accessible 2D equivalent (the Architect
  Table View). Motion MUST respect `prefers-reduced-motion`.
- A change that breaks a budget MUST include a measurement and an ADR, or be reverted.

Rationale: most visitors arrive from a phone. A slow or inaccessible 3D page is a failed page.

### V. Test the Logic, Specify the Rest

- Pure logic (schema validation, scoring, layout, license checks, ranking) MUST have tests written
  before or together with the implementation, including edge cases and boundary values.
- Rendering and UI work MUST have acceptance scenarios in the feature spec and MUST be checked visually
  and for frame time.
- `pnpm check` (lint, typecheck, test and registry validation) MUST pass in CI before merge.

Rationale: the scoring and layout rules are public promises. Tests are how we keep them.

### VI. Security and Trust Boundaries

- All third-party text (manifest fields, repository descriptions, READMEs, user prompts) is
  untrusted. It MUST be validated, length-limited and escaped before display, and MUST NOT be able to
  instruct an LLM.
- LLM output MUST be constrained to a JSON schema and to brick ids that were supplied in the prompt.
  Anything else MUST be discarded.
- Secrets MUST NOT appear in the repository or the client bundle. CI MUST use least-privilege tokens,
  MUST NOT run untrusted code under `pull_request_target`, and third-party actions MUST be pinned to a
  full commit SHA.
- Public endpoints that cost money MUST have bot protection, per-client rate limits and a hard monthly
  budget cap.

Rationale: the registry is open to the public and feeds an LLM. Both are attack surfaces.

### VII. Legal Hygiene and Honest Branding

- Code is MIT. Registry data is CC0. Dependencies MUST be license-compatible with MIT distribution.
- License compatibility guidance MUST come from deterministic SPDX rules, never from an LLM alone, and
  MUST be labeled as not legal advice.
- Branding is original. The README and the site footer MUST state that GitPyramid is independent and
  not affiliated with or endorsed by GitHub, Inc. GitHub marks MAY be used only as links to
  repositories.
- Public claims (stars, contributor counts, partners, endorsements) MUST be true and checkable.

Rationale: the project depends on other people's work and on a platform we do not own.

### VIII. Simple, Cheap and Replaceable

- Prefer free tiers and boring technology. Any paid service or new infrastructure component MUST have
  an ADR with a cost estimate.
- An abstraction MUST wait for a second real use. Deleting code is preferred over adding it.
- Vendor services (LLM, vector store, cache, hosting) MUST sit behind a small interface so a free tier
  change does not force a rewrite.

Rationale: this is bootstrapped by one founder and a community. Cost and complexity are the real
limits.

## Technical Constraints

- Language and tooling: TypeScript in strict mode, Node.js 22 or newer, pnpm workspaces, Biome for
  lint and format, Vitest for tests.
- Web: Three.js through React Three Fiber, `three-mesh-bvh` for picking, static assets served from the
  edge. The web framework choice is recorded in `docs/decisions/`.
- Registry layout: `registry/bricks/<owner>/<repo>.json`, all lowercase, one brick per file.
- Changing the baseline stack above requires an ADR in `docs/decisions/`.

## Development Workflow

- `main` MUST always be releasable. Work happens on short-lived branches named `feat/`, `fix/`,
  `docs/`, `chore/`, `ci/`, `brick/<owner>-<repo>`, or `NNN-feature-name` for Spec Kit features.
- Commits follow Conventional Commits and contain one logical change each.
- A non-trivial feature MUST start with a spec in `specs/NNN-feature-name/` created by
  `/speckit-specify`, then follow plan, tasks and implement.
- A pull request is mergeable when CI is green, docs are updated, a maintainer approved it, and for
  brick pull requests the 4-for-1 requirement is met. Merges are squash merges.

## Governance

This constitution supersedes other project documents. When a spec, plan or pull request conflicts with
it, the constitution wins unless it is amended first.

- Amendments: open a pull request labeled `constitution`, get maintainer approval, and leave it open
  for comment for at least 7 days. Urgent security fixes are exempt. Include a migration note for any
  work the change invalidates.
- Versioning: MAJOR for removing or redefining a principle, MINOR for adding or materially expanding
  one, PATCH for clarifications.
- Compliance: every plan produced by `/speckit-plan` MUST pass the Constitution Check. Reviewers MUST
  verify compliance. Deviations MUST be justified in the plan's Complexity Tracking table.
- Day-to-day guidance for contributors and AI agents lives in `AGENTS.md`.

**Version**: 1.0.0 | **Ratified**: 2026-11-01 | **Last Amended**: 2026-11-01
