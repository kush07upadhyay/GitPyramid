# Plan Review

Status: Draft for founder review | Reviewed: 2026-11-01 | Subject: [GitHub Pyramid Idea Analysis](GitHub%20Pyramid%20Idea%20Analysis.md)

The founding plan is a strong vision. Before a team builds on it, this review checks its claims
against primary sources and checks its arithmetic. Nothing here rejects the idea. Each finding says
what was checked, what was found, and what the docs now do about it.

Severity: **High** blocks launch or causes rework if ignored. **Medium** causes pain later.
**Low** is cosmetic. "Decision" means only the founder can settle it. Open questions use `OQ-` ids
and are collected in the [PRD](PRD.md#13-open-questions).

## Verified correct

These claims were recomputed or checked and hold.

- Solid pyramid of 50 layers holds 42,925 unit cells, and 4,901 are on the outer ring.
- A 60-layer shell that is 2 cells thick holds 13,694 unit cells.
- GitHub GraphQL limits: 5,000 points per hour per user, 500,000 node cap per call, 2,000 points per
  minute secondary limit, 100 concurrent requests.
- Cloudflare Workers Free allows 100,000 requests per day.
- The 4-for-1 review rule exists in `sindresorhus/awesome` and works as described.
- `gitpyramid.com` is unregistered as of 2026-11-01 (RDAP returned 404, DNS returned NXDOMAIN).

## Findings

### F-01 The name collides with the Git trademark policy (High, decision)

The Git Project's trademark policy (git-scm.com/about/trademark, section 2.3) forbids using "Git" as
a syllable in a new word or portmanteau for a third-party product. Its own example is "Gitpedia".
GitHub and GitLab are the only named exceptions. "GitPyramid" matches that pattern. Many tools use a
"Git" prefix and enforcement looks rare, but a forced rename after launch would cost the domain, the
badges and every shared link.

Options, cheapest first:

1. Keep the name and ask Software Freedom Conservancy for written permission
   (trademark@sfconservancy.org). The policy lets them grant exceptions. Do this before buying the
   domain.
2. Rename before launch. These names were free as `.com` (RDAP 404) and as GitHub handles on
   2026-11-01: `repopyramid`, `repomid`, `sourcepyramid`, `codeziggurat`, `ossziggurat`,
   `repoziggurat`, `openziggurat`. Confirm at a registrar before paying.
3. Keep the name and accept the risk.

The docs use "GitPyramid" as the working name. Renaming is a find and replace. See
[ADR-0010](decisions/0010-project-name-and-trademark.md). GitHub redirects renamed repositories, so
links to the repo survive a rename.

### F-02 Cells are not bricks (High)

The plan says one 60-layer shell exposes "13,694 clickable bricks". That number counts unit cells.
Bricks occupy 1, 2, 4 or 8 cells. At a tier mix of 50% small, 30% standard, 15% pillar and 5%
foundation, the mean brick is 2.1 cells, so the same shell holds about 6,520 bricks. Reaching 50,000
bricks needs about 105,000 cells (a single shell of roughly 164 layers) or several structures.

Resolution: capacity is defined in cells, and a monument has a fixed size chosen when it is created
(an Epoch). The plan's first manifest of 500 bricks plus 4,500 empty slots is about 5,000 cells.
Proposal in [ARCHITECTURE](ARCHITECTURE.md#capacity): Epoch I is about 5,000 cells and holds roughly
2,400 bricks. Later Epochs add structures, as the plan's "Monument Epochs" already describe.

### F-03 Layer numbering and lattice alignment are ambiguous (Medium)

Two statements conflict. The formula makes layer 1 the 1-cell apex. The seed script puts Brick
#0001 "at the center of Layer 1" and the text calls it "the center of the Pyramid's base".

Also, layers of side 1, 2, 3 and so on, stacked and centered, are offset by half a cell. That is not
lattice aligned. Lattice aligned stacks use odd sides (1, 3, 5, ...) and give different counts. For
example 26 odd layers with a 2-thick shell hold 5,002 cells, close to the 5,000 target.

Resolution: layers are numbered from the base. The lattice choice is made in the layout spec before any
coordinates are published. Capacity figures in the docs are formulas, not promises.

### F-04 The state model has a gap (Medium)

The plan defines Solid (score at least 55 and active), Translucent (under 9 months old or being
built), Weathered (over 365 days since a push) and Wireframe (empty slot). An active repository that
is older than 9 months but scores under 55 has no state. A small niche library scoring 49.7 is a
realistic example.

Resolution: Weathered wins first, then Translucent, and everything else is Solid. "Battle-tested" (score
at least 55) becomes a label, not a state. See [SCORING](SCORING.md#states). Needs founder
confirmation (OQ-04).

### F-05 Derived values must not live in manifests (High)

The plan stores `pScore`, `state`, `layer`, `gridCoord` and `dimensions` in each brick manifest.
Those values change weekly or depend on every other brick. Storing them causes weekly churn across
thousands of files, lets contributors fake their own score, and makes parallel pull requests collide.

Resolution: three trust tiers. Community manifests hold facts only. A maintainer-owned ledger holds ids and
curation. Scores, states and positions are computed at build time. See
[ADR-0003](decisions/0003-registry-data-model.md).

### F-06 Coordinates conflict between parallel pull requests (High)

If a contributor must pick a `gridCoord`, two pull requests will claim the same slot, and the first
merge forces a rebase on the others. Friends joining after your Instagram post will hit this at once.

Resolution: contributors never choose a position. A maintainer or bot appends an entry to
`registry/ledger.jsonl` at merge time. See [ADR-0004](decisions/0004-stable-slots-and-ledger.md).

### F-07 Score-driven size conflicts with stable positions (High)

Brick size comes from the live score, and the score changes. A brick cannot grow in place without
colliding with its neighbors, and moving bricks breaks every shared link and screenshot.

Resolution: size and position are fixed at admission from the score at that time. Re-tiering happens only
in a scheduled, reviewed migration at an Epoch boundary. Live metrics drive color, opacity and
labels only. The monument is pre-partitioned into typed slots (1, 2, 4 and 8 cells) so appending
never fragments it. See [ADR-0004](decisions/0004-stable-slots-and-ledger.md).

### F-08 Five sectors do not fit four faces (Medium, decision)

The plan has five sector colors and a square monument with four faces. It does not say where the fifth
sector goes. Options: (A) five angular wedges, which look lopsided on a square; (B) four faces for
four sectors and the hollow atrium for the fifth, which gives four iconic face stairways plus one
inner stair; (C) a pentagonal monument, which breaks the plan's square-number math.

Recommendation: B, with capacity quotas so the atrium sector is not starved or oversized. Decide in the
layout spec (OQ-01).

### F-09 The score needs clamps (Medium)

The popularity term is `0.7*log10(S+1)/5.5 + 0.3*log10(F+1)/4.5`. It exceeds 1 for very large
repositories. A repository with 600,000 stars and 60,000 forks scores 26.35 points out of 25.

Resolution: every sub-term is clamped to the range 0 to 1, and a test covers it. See
[SCORING](SCORING.md#formula).

### F-10 "Impact" is subjective and gameable (Medium)

The fourth pillar (25 points) is a curator judgment. If contributors set it, they will rate their own
repositories 5 out of 5.

Resolution: impact is a 1 to 5 rubric level held in the maintainer-owned ledger. Contributors never set
it. See [SCORING](SCORING.md#impact-rubric).

### F-11 Some metrics need extra API calls (Low)

Human contributor counts are not a GraphQL field. They need a REST call per repository, with a bot
filter. Repositories with issues disabled (for example the Linux kernel mirror) have no issue ratio.

Resolution: the ingestion spec budgets REST calls with ETags. Scoring uses a neutral 0.5 issue health when
issues are disabled or absent.

### F-12 three-mesh-bvh does not speed up InstancedMesh picking (High)

`three-mesh-bvh` accelerates raycasts against triangles of a geometry, and supports BatchedMesh, point
clouds, lines and an object hierarchy. It does not remove the per-instance loop inside three.js
`InstancedMesh`. For 50,000 identical cubes, a geometry BVH helps almost nothing.

Resolution: the constitution no longer names a library. Two candidates go to a benchmark spike: a voxel-grid
ray march over the slot lattice (cost depends on ray length, not brick count), and the instance BVH
in `@three.ez/instanced-mesh` (single maintainer, 459 stars, so wrap it). See
[ADR-0009](decisions/0009-picking-and-transparency.md).

### F-13 alphaHash is noisy (Medium)

Three.js documents `alphaHash` as randomized, with visible grain that temporal anti-aliasing reduces.
The translucent pass needs either TAA, per-instance opacity with sorting and no depth writes, or a
deterministic dither or tinted-glass look that needs no real blending. Part of ADR-0009.

### F-14 Memory and wire-size numbers are off (Low)

At 76 bytes per brick (64 for a matrix, 12 for a color), 50,000 bricks need 3.8 MB (3.62 MiB), not
3.11 MB. The 600 KB wire budget only works if the file stores compact records (position, size code,
sector, state) and the client builds matrices. See [ARCHITECTURE](ARCHITECTURE.md#compiled-manifest).

### F-15 "100% of bricks are clickable" is a design goal, not a fact (Medium)

A shell 2 cells thick has an inner ring that is hidden unless the camera can enter the atrium. The
claim is true only if every brick has at least one exposed face.

Resolution: this becomes a tested invariant in the layout spec, computed from an occupancy grid.

### F-16 Actions GITHUB_TOKEN is too small for ingestion (High)

In GitHub Actions the built-in token gets 1,000 GraphQL points per hour per repository, not 5,000. A
weekly refresh of thousands of repositories needs a fine-grained personal access token or a GitHub
App, stored as a secret.

Resolution: the ingestion spec uses a GitHub App or a read-only token. CI for pull requests uses the
built-in token only for a handful of calls.

### F-17 Cloudflare Pages is the legacy path (Medium)

Cloudflare's migration guide now treats Workers with static assets as the home for new static sites
and full-stack apps. Static asset requests are free. One limit matters: a Worker version holds at
most 20,000 static files on the Free plan, so 50,000 prerendered brick pages do not fit. Also, a
custom domain needs its nameservers on Cloudflare.

Resolution: the web app targets Workers with static assets and renders brick pages from a compact index, not 50,000
files. See [ADR-0011](decisions/0011-web-framework-and-hosting.md).

### F-18 Static export cannot make dynamic previews or permalinks (Medium)

Shareable stack blueprints need a stored blueprint, a short id and a generated social preview image.
A static export cannot do any of that.

Resolution: Worker plus key-value storage. Ids are content hashes of the sorted brick ids, so there is no
free text slug to moderate. Free-text titles are out of scope for the first version.

### F-19 One-click pull request needs a server secret (Medium)

Opening a pull request from the user's account needs a GitHub OAuth app. The code exchange uses a
client secret that cannot live in a static site.

Resolution: the first version generates the manifest in the browser and opens GitHub's own "new file" page with
the content prefilled. GitHub handles sign-in, the fork and the pull request. No secret, no scope
risk. OAuth can come later.

### F-20 Free-tier providers can change (Medium)

The plan relies on Groq's free tier, Gemini Flash-Lite, Upstash and Supabase free plans. Limits and
terms change without notice.

Resolution: an LLM adapter interface with a fallback chain and a hard monthly cap that fails closed (the
feature turns itself off), per constitution principles VI and VIII. Re-verify numbers in the plan's
cost table before relying on them.

### F-21 Manifests can attack the LLM (High)

The AI Stack Architect feeds retrieved manifest text to a model. A contributor can write
"ignore your instructions" in `problemSolved`.

Resolution: strict length and character rules at validation time, a heuristic warning for injection phrases,
and structure at runtime: the model may only select brick ids that were in its prompt, output must
match a JSON schema, and anything else is discarded.

### F-22 License checks must not come from an LLM (High)

An LLM can be confidently wrong about whether two licenses combine. The plan also promises "verified
license compatibility".

Resolution: compatibility comes from a deterministic SPDX rule table, labeled "not legal advice". The model
only proposes stacks.

### F-23 The 4-for-1 rule has a cold-start problem (High)

On day one there are no other open pull requests to review, so no one can satisfy the rule.

Resolution: the rule is "review the lesser of 4 and the number of other open pull requests". The maintainer
seeds a review pool of real pull requests before announcing. See [GOVERNANCE](../GOVERNANCE.md).

### F-24 Maintainer-owned products need disclosure (Medium)

The plan places "Powered by Vidective AI" panels in every brick drawer. That is the founder's own
product inside a neutral registry.

Resolution: such panels are labeled "By the maintainer" and are treated like sponsor placements. They never
use or change ranking. Constitution principle IX covers this since v1.3.0.

### F-25 Sponsorship needs a firewall (High, new requirement)

Sponsor stairways fund the project. Without rules they destroy the registry's credibility.

Resolution: constitution principle IX, [SPONSORSHIP](SPONSORSHIP.md) and
[ADR-0008](decisions/0008-grand-stairways-and-sponsor-steps.md).

### F-26 Low-effort submissions will arrive after a viral post (Medium)

The plan cites Hacktoberfest spam as a risk but the mitigation is only the 4-for-1 rule.

Resolution: objective admission criteria, CI checks that run before a human looks, a minimum-signal warning,
and a stated policy on AI-generated and self-promotional pull requests. See
[GOVERNANCE](../GOVERNANCE.md).

### F-27 Plan typos and stale references (Low)

- 88.58% of cells in a solid 50-layer pyramid are hidden, not 88.5%.
- The plan says `github.com/kushal/gitpyramid`. The repository is `kush07upadhyay/GitPyramid`.
- The plan file contains citation artifacts such as `[span_4](start_span)` inside "gitpyramid.com".
  The file is kept verbatim as the source of truth.
- The cost table's Supabase and Upstash prices, Groq limits and Gemini prices were not re-verified
  here. Re-check at purchase time.

## Not verified

- Domain registration price at Cloudflare (the plan says $10.46 per year). Confirm at checkout.
- Any third-party free-tier limit other than Cloudflare Workers and GitHub's API limits.
- Whether the name `GitPyramid` conflicts with a registered trademark. A professional search is
  advised before paying for branding.
