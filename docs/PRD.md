# Product Requirements Document

Status: Draft v0.2 for founder review | Owner: @kush07upadhyay | Updated: 2026-11-01 |
Source: [founding analysis](GitHub%20Pyramid%20Idea%20Analysis.md) | Checked by: [PLAN_REVIEW](PLAN_REVIEW.md)

Working name: GitPyramid (see [ADR-0010](decisions/0010-project-name-and-trademark.md)).

## 1. Summary

GitPyramid is a 3D open-source monument. Every vetted open-source project is a brick. Visitors
climb **Grand Stairways** to reach bricks, and an AI **Stack Architect** lights up a compatible set of
bricks for a project idea. The registry is plain files that anyone can improve by pull request.
Sponsors fund the stairs. They never influence what is listed or how it ranks.

Repository tagline: "The Pyramid of all the relevant repos and tools a developer needs."

**Why it can win.** It combines three things no single competitor does:

| Alternative | What it does well | What GitPyramid adds |
| :--- | :--- | :--- |
| Awesome lists | Human curation, huge reach | Spatial exploration, structured data, AI stack synthesis |
| roadmap.sh | Learning paths | Choosing a verified multi-repo stack for a build |
| OSS Insight | Deep GitHub analytics | Analytics turned into a clear visual and a decision |
| Best of JS, LibHunt, OpenAlternative | Fast lookups | All languages, one place, compatibility awareness |
| DeepWiki | Explains one repo | Recommends which 4 to 6 repos to combine |
| GitHub Skyline, CodeCity | Shareable 3D of one codebase | 3D for the whole ecosystem, usable as a tool |

## 2. Problem and opportunity

1. **Discovery is noisy.** Developers search, read threads and skim lists. Stars reward age, not fit.
2. **Stack choice is manual.** Combining libraries and checking license compatibility takes hours.
3. **Maintainers lack visibility and funding.** Valuable libraries with 2,000 stars are invisible.
4. **Community curation decays.** Lists rot, attract spam, and depend on one person.

Opportunity: a memorable visual that spreads on short video, a registry anyone can fix, and an AI
that reasons over curated data instead of the open web.

## 3. Users and jobs

| Persona | Job to be done | Success looks like |
| :--- | :--- | :--- |
| **Builder** (starting a project) | "Tell me which repos to combine." | A short, license-checked stack in under a minute. |
| **Explorer** (curious developer) | "Show me what exists in this area." | Finds a tool they did not know, in a few clicks. |
| **Contributor** (friend, student, OSS fan) | "Help improve this, and be credited." | First merged brick in about 10 minutes. |
| **Maintainer of a listed project** | "Make my project visible and accurate." | Correct entry, a badge for the README, more visits. |
| **Sponsor** (developer-tool company) | "Reach developers without spamming them." | A tasteful placement with honest numbers. |
| **Founder** | "Keep this open, credible and affordable." | Costs covered, trust intact, community self-sustaining. |

## 4. Goals, non-goals and metrics

**Goals**

- G1. Make the registry the best-curated, most contributor-friendly map of open source.
- G2. Make exploring it a delight on a phone, and accessible without 3D.
- G3. Turn a project idea into a checked stack in one step.
- G4. Fund the project through sponsors without selling trust.
- G5. Build a self-sustaining community of quality contributors.

**Non-goals (first year)**

- Hosting or mirroring third-party code.
- A package registry, a code search engine or a replacement for project docs.
- Paid ranking, paid bricks or "featured" listings of any kind.
- User accounts, comments or social features on the site.
- Native apps and browser extensions.

**Metrics.** Targets are proposals for the founder to confirm. Long-term the plan hopes for 10,000 to
25,000 stars and 50,000 bricks.

| Stage | Metric | Proposed target |
| :--- | :--- | :--- |
| R0, first 30 days after announcing | Merged bricks | 150 |
| | External contributors with a merged PR | 20 |
| | GitHub stars | 100 |
| | Median time to first review | under 48 hours |
| R1, first 30 days after the monument is live | Unique visitors | 20,000 |
| | Visitors who open at least one brick | 40% |
| | Stack Architect queries | 1,000 |
| | GitHub stars | 1,000 |
| Always (guardrails) | Frame time on a mid-range phone | 60 FPS target |
| | Accessibility audit | WCAG 2.2 AA pass |
| | AI cost per 1,000 queries | within the monthly cap |
| | Sponsor-related complaints about rankings | zero |
| | Share of pull requests closed as spam | under 30% |

## 5. Product rules

The [constitution](../.specify/memory/constitution.md) is binding. In product terms:

1. The registry is the product. Everything else is derived from it.
2. Anyone can contribute with a web browser. CI explains every failure in plain language.
3. Positions and ids never change silently. People share links and screenshots.
4. Every 3D feature has an accessible 2D equivalent.
5. Sponsors fund the stairs. Sponsorship never changes bricks, scores, ranking or AI answers.
6. Third-party text is untrusted. Advice about licenses is deterministic and labeled.

## 6. Releases and scope

The plan builds the 3D scene first and the contributor path last. Friends arrive within days, so
this PRD builds the contributor path first.

| Release | Weeks | Scope | Exit criteria |
| :--- | :--- | :--- | :--- |
| **R0 Foundation** | 0 to 2 | Docs, governance, schema, validator, scoring, taxonomy, seed bricks, CI, launch kit, review pool | A stranger adds a valid brick through the web editor and CI guides them. Seed set merged. |
| **R1 Monument** | 3 to 6 | Layout engine, ingestion, viewport, picking, brick drawer, Grand Stairways with plain stone, Table View, client search, brick pages, deep links | 60 FPS target met on the reference phone. WCAG 2.2 AA on 2D views. Seed 500 visible. |
| **R2 Architect** | 6 to 7 | Worker, retrieval, LLM adapter, deterministic license rules, share permalinks | Fails closed under cap. Injection tests pass. |
| **R3 Loop** | 8 and later | Claim-a-brick page, README badges, review bot, decay job, sponsor program with Founding Steps, contributors wall | First sponsor placement live, labeled and measured. |

## 7. Functional requirements

Priority: P0 must ship in the release. P1 should. P2 may slip. Acceptance details live in each
spec under `specs/`.

### Registry

| ID | Requirement | Pri | Rel | Acceptance |
| :--- | :--- | :--- | :--- | :--- |
| REG-1 | Brick manifest schema v1 with plain-language errors including line and column | P0 | R0 | A JSON typo produces a message that says what to fix. |
| REG-2 | `pnpm validate` CLI with offline and `--online` checks and GitHub annotation output | P0 | R0 | CI marks the exact line of a failing manifest. |
| REG-3 | Taxonomy of 5 sectors with categories and a taxonomy request flow | P0 | R0 | A missing category has a documented path. |
| REG-4 | Maintainer-owned ledger with id, impact and tier | P0 | R0 | Contributors cannot set impact. Ids never repeat. |
| REG-5 | Seed set of real bricks including the foundation brick | P0 | R0 | At least 10 bricks validate online. Seed 500 follows in R1. |
| REG-6 | `pnpm brick:new owner/repo` scaffolder with GitHub prefill | P1 | R0 | Produces a manifest that fails only on the human fields. |
| REG-7 | Weekly job flags archived, renamed or deleted repositories | P1 | R3 | Issue opened per flagged brick. |

### Scoring and ingestion

| ID | Requirement | Pri | Rel | Acceptance |
| :--- | :--- | :--- | :--- | :--- |
| SCR-1 | Pure scoring package as specified in [SCORING](SCORING.md) | P0 | R0 | Worked examples and every edge case are tests. |
| SCR-2 | Ingestion job writes a versioned metrics snapshot and survives rate limits | P0 | R1 | A forced 403 leaves the previous snapshot in use. |
| SCR-3 | Tier thresholds calibrated on the Seed 500, histogram published | P1 | R1 | Mix is near 50, 30, 15, 5 percent. |

### Layout and viewport

| ID | Requirement | Pri | Rel | Acceptance |
| :--- | :--- | :--- | :--- | :--- |
| LAY-1 | Deterministic, append-only slot lattice with invariants I1 to I6 | P0 | R1 | Property tests for determinism, visibility and no overlap. |
| LAY-2 | Compiled manifest at most 600 KB over the wire at 50,000 bricks | P0 | R1 | Measured in CI on a generated fixture. |
| LAY-3 | Epoch migration tool with a dry-run diff | P1 | R1 | Produces a reviewable file diff. |
| VIEW-1 | Four-pass rendering in at most 4 draw calls | P0 | R1 | Frame capture shows 4 calls. |
| VIEW-2 | Pointer picking per [ADR-0009](decisions/0009-picking-and-transparency.md) | P0 | R1 | Under 4 ms at the 95th percentile on the reference phone. |
| VIEW-3 | Brick drawer with stats, license, links, alternatives and compatible bricks | P0 | R1 | Every field comes from manifest or snapshot. |
| VIEW-4 | Architect Table View, default on low-end devices | P0 | R1 | WCAG 2.2 AA, keyboard complete. |
| VIEW-5 | Four visual states with a legend | P1 | R1 | States match SCORING rules. |
| VIEW-6 | Deep links to bricks and camera positions | P1 | R1 | `/brick/<owner>/<repo>` opens focused, no tour. |
| VIEW-7 | Reduced motion and full keyboard control | P1 | R1 | No animation under `prefers-reduced-motion`. |

### Grand Stairways and sponsors

| ID | Requirement | Pri | Rel | Acceptance |
| :--- | :--- | :--- | :--- | :--- |
| STAIR-1 | Stairway cells reserved in the layout, plain stone treads | P0 | R1 | No brick ever occupies a stair cell. |
| STAIR-2 | Stair navigation: sector, category landing, brick, with keyboard, touch and skip | P0 | R1 | Every brick reachable by keyboard only. |
| STAIR-3 | Landings with category signposts | P1 | R1 | Each category has one landing. |
| SPN-1 | Sponsor schema and build pipeline (validate, re-encode, plate) | P0 | R3 | Invalid art fails the build with a clear message. |
| SPN-2 | Poster pass in one draw call, atlas at most 512 KB, loaded after first render | P0 | R3 | Budget test in CI. |
| SPN-3 | "Sponsor" labels, `/sponsors` page, `rel="sponsored noopener noreferrer"` | P0 | R3 | A poster not on the page fails the build. |
| SPN-4 | First-party aggregate reporting, no cookies, respects DNT and GPC | P0 | R3 | No personal data stored. |
| SPN-5 | Isolation: brick manifest identical with and without sponsors | P0 | R3 | Byte-equality test, plus an import lint rule. |
| SPN-6 | Placeholders in forks and default builds | P1 | R3 | No real logo without the official flag. |

### Search and the Stack Architect

| ID | Requirement | Pri | Rel | Acceptance |
| :--- | :--- | :--- | :--- | :--- |
| SRCH-1 | Client-side search by id, name, category and filter, flies the camera | P0 | R1 | Results under 50 ms for 50,000 bricks. |
| SRCH-2 | Stack Architect Worker that fails closed under budget cap and bot failure | P1 | R2 | Tier 1 still works when Tier 2 is off. |
| SRCH-3 | Deterministic SPDX license compatibility, labeled not legal advice | P1 | R2 | Rule table has tests per pair. |
| SRCH-4 | Stack permalinks as content hashes, with preview images | P2 | R2 | Same bricks, same URL. |

### Contribution and growth

| ID | Requirement | Pri | Rel | Acceptance |
| :--- | :--- | :--- | :--- | :--- |
| CON-1 | CONTRIBUTING, issue forms, PR template, "add a brick in 10 minutes" | P0 | R0 | A new user succeeds without cloning. |
| CON-2 | CI gatekeeper with inline annotations and a job summary | P0 | R0 | Runs on fork PRs without secrets. |
| CON-3 | 4-for-1 rule with cold-start behavior and a seeded review pool | P0 | R0 | Five real open PRs exist at announce time. |
| CON-4 | Claim-a-brick page opens GitHub's new-file page with prefilled JSON | P1 | R3 | No OAuth secret anywhere. |
| CON-5 | Review bot verifies claimed reviews, read-only token | P2 | R3 | Comments through a safe workflow pattern. |
| CON-6 | Contributor recognition generated from merged pull requests | P1 | R3 | Wall matches git history. |
| GRO-1 | Per-brick README badge endpoint | P1 | R3 | SVG, cached, links to the brick page. |
| GRO-2 | SEO brick pages and sharded sitemaps | P1 | R1 | Each brick has a crawlable page. |

## 8. Non-functional requirements

| Area | Requirement |
| :--- | :--- |
| Performance | 4 draw calls, 60 FPS target on mid-range mobile, pixel ratio capped at 1.5, manifest under 600 KB over the wire, sponsor atlas under 512 KB and lazy. |
| Accessibility | WCAG 2.2 AA for 2D views, keyboard and screen-reader parity, `prefers-reduced-motion` respected, posters never between bricks in reading order. |
| Security | Strict CSP, least-privilege CI, SHA-pinned actions, untrusted-text handling, LLM output constrained to supplied ids. |
| Privacy | No cookies, no third-party analytics, first-party aggregate counts only, DNT and GPC respected. |
| Reliability | Degradation matrix in [ARCHITECTURE](ARCHITECTURE.md#failure-modes). Builds are reproducible. |
| Cost | Free tiers first. MVP target under about $2 a month plus the domain. Hard monthly cap on AI. |
| Compatibility | Latest two versions of Chrome, Safari, Firefox and Edge. WebGL2 for the monument. Everything else works without it. |
| Internationalization | English first. Strings kept out of components from day one. Translated docs welcome after R1. |
| Legal | MIT code, CC0 registry, sponsor art excluded, non-affiliation notices, deterministic license advice. |

## 9. Key journeys

1. **Visitor from a Reel, on a phone.** Lands on the monument, sees the empty wireframe slots and
   the colored sectors, taps a stairway, climbs to a landing, opens a brick, shares the link.
2. **Builder asks for a stack.** Types "local-first video editor in TypeScript", sees five bricks
   lit and connected, reads the license note, copies the blueprint.
3. **Contributor adds a first brick.** Opens the issue form or the new-file link, fills a short
   JSON file, CI explains one mistake, they fix it, review four open pull requests, get merged,
   and appear on the contributors wall.
4. **Maintainer of a listed project** finds their brick, corrects a category by pull request and
   adds the badge to their README.
5. **Sponsor** reads `/sponsors`, sees the independence rules and reporting method, emails the
   sponsors address, signs, and sees a labeled poster after the next build.
6. **Founder's weekly ritual.** Checks ingestion health, merges ready pull requests, appends ledger
   lines, sends sponsor reports, and reviews flagged repositories.

## 10. Content and data

- **Sectors and colors:** Systems (blue `#1A73E8`), Frontend (cyan `#12B5CB`), Backend (green
  `#81C995`), AI (purple `#C58AF9`), DevOps, Security and Tooling (orange `#FA903E`).
- **Tiers:** Modular Unit, Standard Ashlar, Structural Pillar, Foundation Core (1, 2, 4, 8 cells).
- **States:** Solid, Translucent, Weathered, plus empty wireframe slots.
- **Data model:** [ADR-0003](decisions/0003-registry-data-model.md). **Taxonomy:**
  `registry/taxonomy.json`.
- **Writing a brick description:** one plain sentence, 20 to 160 characters, saying what problem the
  project solves. No marketing words, no links, no markup, no em dashes.

## 11. Dependencies, constraints and assumptions

- GitHub API limits (see [ARCHITECTURE](ARCHITECTURE.md#ingestion)). Ingestion needs a GitHub App or
  token held as a secret.
- Cloudflare free tiers for hosting and the Worker. Attaching the domain needs Cloudflare
  nameservers.
- Free LLM and vector tiers can change. Providers sit behind an interface.
- One founder with limited hours. Process must be light, and tooling must carry the load.
- Assumption: most visitors arrive from short video on phones. Mobile is the primary target.
- Assumption: companies will pay for labeled placements once real traffic numbers exist.

## 12. Risks

| ID | Risk | Mitigation |
| :--- | :--- | :--- |
| RK-1 | Name conflicts with the Git trademark policy | ADR-0010: ask for permission or rename before the domain purchase and announcement. |
| RK-2 | Spam and low-quality pull requests after a viral post | CI gatekeeper, 4-for-1, admission criteria, AI policy, review pool. |
| RK-3 | Slow or hot on budget phones | Four-pass budget, spike for picking, Table View default on low-end. |
| RK-4 | Sponsors erode trust | Principle IX, public Sponsors page, isolation tests, labels. |
| RK-5 | Solo founder overload, bus factor of one | Light process, sector captains, documented rituals, org transfer later. |
| RK-6 | AI abuse runs up costs | Bot check, rate limits, cache, hard cap that fails closed. |
| RK-7 | GitHub API or free-tier terms change | Snapshots, adapters, previous-value fallback. |
| RK-8 | Legal: license advice, trademarks, sponsor logos | Deterministic rules, disclaimers, sponsor agreement, placeholders in forks. |
| RK-9 | Cold start: nothing to review, nothing to see | Review pool, seeded bricks, wireframe slots as a call to action. |
| RK-10 | Building 3D before the registry earns trust | Release order puts R0 first. |
| RK-11 | Side-project and employer policy conflict | Founder checks the employment agreement (see NEXT_STEPS). |

## 13. Open questions

| ID | Question | Recommendation | Needed by |
| :--- | :--- | :--- | :--- |
| OQ-01 | Where does the fifth sector live on a four-faced monument? | Four faces for four sectors, the atrium for the fifth, with capacity quotas. | Layout spec |
| OQ-02 | Which lattice, and how big is Epoch I? | Odd-side lattice, about 5,000 cells (26 layers), roughly 2,400 bricks. | Layout spec |
| OQ-03 | Keep the name GitPyramid? | Email Conservancy now. Have a fallback ready. | Before domain and announcement |
| OQ-04 | Is "battle-tested" a label rather than a state? | Yes. | Before scoring is published |
| OQ-05 | Astro or Next.js? | Astro with a React island. | Before the viewport spec |
| OQ-06 | Final tier thresholds | Calibrate on the Seed 500. | After the first ingestion |
| OQ-07 | Sponsor prices and inventory | Wait for 30 days of traffic. Sell Founding Steps cheaply before. | R3 |
| OQ-08 | Where does the metrics snapshot live? | Object storage (R2), not git. | Ingestion spec |
| OQ-09 | Move the repository to a GitHub organization? | Yes, once the name is settled. GitHub redirects the old URL. | Before launch |
| OQ-10 | Analytics choice | Cookieless first-party counters only. | R1 |
| OQ-11 | How do the founder's own products appear? | Labeled "By the maintainer", same rules as sponsors. | R1 |
| OQ-12 | Contributor recognition | Generated wall from merged pull requests, not a manual file. | R3 |
| OQ-13 | In what order does a landing list its bricks? | A plain, documented, deterministic order (for example by score then id), never influenced by sponsors. | Spec 003 plan |
| OQ-14 | Does Epoch II continue the same stairways? | Yes, so shared links stay valid. The number of risers grows. | Layout spec |

## 14. Glossary

- **Brick:** one vetted open-source project in the registry.
- **Sector, category:** the top-level and second-level classification of a brick.
- **Tier, state:** a brick's size class (from its score at admission) and its live look (from live metrics).
- **Cell, slot:** a unit cube of space, and a reserved spot of 1, 2, 4 or 8 cells for one brick.
- **Epoch:** one monument of fixed size. When full, a new connected structure begins.
- **Atrium:** the hollow core of the monument.
- **Grand Stairway, landing, tread, riser:** the carved route to bricks, its category platforms, its
  steps and the vertical face of a step.
- **Sponsor Step, plate:** a labeled poster on a riser, and the standard background our build draws
  behind a sponsor logo.
- **Ledger:** the maintainer-owned file of ids and curation.
- **Snapshot:** the latest fetched GitHub metrics, never committed.
- **Stack Architect:** the AI feature that proposes a compatible set of bricks.
- **Architect Table View:** the accessible 2D table version of the whole registry.
- **4-for-1, review pool:** the rule that authors review other pull requests, and the real pull
  requests the maintainer opens so newcomers have something to review.
