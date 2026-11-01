# Roadmap

Status: Draft | Updated: 2026-11-01 | Scope and requirement ids: [PRD](PRD.md#6-releases-and-scope)

The founding plan builds the 3D scene first and the contributor path last. Friends and followers
arrive within days, so this roadmap builds what they can use first: a registry, a validator and a
review pool. The monument follows once there is data to show.

Dates are relative to the day the repository is announced (week 0). Nothing here is a promise to
the public until it is ticked.

## Before the announcement (days 0 to 3)

Owner: founder. Details and click paths: [NEXT_STEPS](NEXT_STEPS.md).

- [ ] Decide the name ([ADR-0010](decisions/0010-project-name-and-trademark.md)), then buy the domain.
- [ ] Set up email forwarding for `conduct@`, `security@`, `sponsors@` and `hello@`.
- [ ] Apply GitHub settings with `pnpm setup:github` (a dry run first), then enable Discussions by hand.
- [ ] Create labels and the first issues. Open the review pool pull requests.
- [ ] Post the announcement from the [launch kit](launch/contributor-launch-kit.md).

## R0 Foundation, weeks 0 to 2

Goal: a stranger can add a valid brick in about 10 minutes and CI guides them.

| Work | Spec or doc | Contributor on-ramp |
| :--- | :--- | :--- |
| Registry schema, validator, taxonomy, ledger | spec 001 | Add bricks, improve error messages, add test fixtures |
| Scoring package | spec 002 | Review formulas, add edge-case tests |
| Seed set, then the Seed 500 | seed issues | Claim "Add brick" issues |
| CI gatekeeper, templates, forms | repo | Report friction in first contributions |
| Grand Stairways and Sponsor Steps spec | spec 003 | Comment on the design, mock up poster plates |
| Docs and launch kit | docs | Fix typos, translate CONTRIBUTING |

Exit: five or more external pull requests merged, median first review under 48 hours.

## R1 Monument, weeks 3 to 6

Goal: a phone-friendly monument you can explore, with an accessible table version.

| Work | Spec | On-ramp |
| :--- | :--- | :--- |
| Layout engine, Epoch I, compiled manifest | spec 004 (planned) | Property tests, visibility invariant |
| Ingestion and metrics snapshot | spec 005 (planned) | GraphQL batching, ETag handling |
| Picking and transparency spike | ADR-0009 | Benchmarks on real phones |
| Viewport, drawer, stair navigation with plain stone | spec 006 (planned) | 3D, UI, motion design |
| Architect Table View, client search, brick pages | spec 006 | Accessibility testing, SEO |
| Calibrate tiers on the Seed 500 | SCORING | Data analysis |

Exit: reference-phone frame time met, WCAG 2.2 AA on 2D views, Seed 500 visible.

## R2 Architect, weeks 6 to 7

Worker, retrieval, LLM adapter with fallback, deterministic license rules, stack permalinks. Exit:
the feature fails closed under the budget cap and injection tests pass.

## R3 Loop, week 8 and later

Claim-a-brick page, per-brick README badges, review bot, weekly decay job, contributors wall, and
the sponsor program starting with Founding Steps. Exit: first labeled, measured sponsor placement.

## Spec map

Spec numbers follow creation order. Planned specs are written when their work starts, with the
Spec Kit commands or by hand in the same shape.

| Spec | Title | Status |
| :--- | :--- | :--- |
| 001 | Brick registry and validator | Implemented in R0 |
| 002 | Pyramid score | Implemented in R0 |
| 003 | Grand Stairways and Sponsor Steps | Draft, design only |
| 004 | Monument layout | Planned, R1 |
| 005 | Ingestion pipeline | Planned, R1 |
| 006 | Viewport, navigation and Table View | Planned, R1 |
| 007 | Stack Architect | Planned, R2 |
| 008 | Claim a brick, badges, review bot | Planned, R3 |

## What we are not building yet

User accounts, comments, a mobile app, paid ranking of any kind, mirroring third-party code, and a
public API. The registry itself is the API: it is CC0 files that anyone can read.

## Labels

| Group | Labels |
| :--- | :--- |
| Type | `type/brick`, `type/bug`, `type/feature`, `type/spike`, `type/docs` |
| Area | `area/registry`, `area/scoring`, `area/layout`, `area/3d`, `area/ai`, `area/web`, `area/ci`, `area/docs`, `area/sponsors` |
| Entry | `good first issue`, `help wanted` |
| Process | `needs-triage`, `needs-review`, `blocked`, `constitution`, `adr-needed` |
| Priority | `P0`, `P1`, `P2` |

The definitions live in `.github/labels.yml` and are applied by `tools/github-setup.ts` (`pnpm setup:github`).
