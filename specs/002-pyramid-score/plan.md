# Implementation Plan: Pyramid Score

**Branch**: `002-pyramid-score` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

## Summary

A small, pure TypeScript package turns GitHub metrics and a maintainer-set impact level into a score,
a state and a size tier. Constants live in a validated JSON config so changing one is a reviewed
data change, not a code change.

## Technical Context

| Item | Choice |
| :--- | :--- |
| Language | TypeScript 7 on Node.js 22, ESM |
| Libraries | Zod 4 for the config schema. No runtime I/O |
| Storage | `registry/scoring.config.json` |
| Testing | Vitest, table-driven, plus properties over a seeded pseudo-random grid |
| Performance | About 2 microseconds per repository |
| Constraints | Pure functions, deterministic across engines, no clock and no randomness |

## Constitution Check

| Principle | How this feature complies |
| :--- | :--- |
| I. The registry is the product | The config is a registry file. Derived values are never committed |
| III. Determinism and stability | Exact-decimal rounding, one rounding of the total, tier stored at admission, no clock |
| V. Test the logic | Worked examples, every edge case mapped to a test, properties, a source scan for purity |
| VI. Security and trust boundaries | Inputs are validated at the boundary. Bad numbers throw instead of flowing on |
| VII. Honest branding and claims | The formula, config and tests are public, so a score can be reproduced by anyone |
| VIII. Simple, cheap and replaceable | No dependencies beyond Zod. Config passed in as an argument, no globals |
| IX. Sponsorship never buys curation | Sponsors are not an input to any function. The only judgment-based input is the impact level, a public rubric that only maintainers own |

## Project Structure

```text
registry/scoring.config.json      constants, versioned
packages/scoring/src/
  config.ts                       schema and parseScoringConfig
  numbers.ts                      round2, clamp01, input checks
  score.ts                        issueHealth, computeScore, rateRepository
  state.ts                        deriveState
  tiers.ts                        TIER_IDS, tierForScore
  index.ts                        public API
  examples.ts, test-helpers.ts    shared test data and the real config
  *.test.ts                       examples, score, state and tier, config
```

## Design Decisions

- **D-1 Constants in data.** A reviewed edit to a JSON file changes a weight. The package holds no
  copy, and the tests read the real file so the doc, the config and the code are tied together.
- **D-2 The config validates itself.** Weights that do not sum to 1 would let a pillar pass 25 points,
  so they are rejected. Tiers must start at 0 and strictly increase. Unknown keys are rejected. All
  problems are reported at once.
- **D-3 Closed tier vocabulary.** The four tier ids are fixed because the ledger stores them. The
  registry package imports them from here so the two cannot drift. Only thresholds and names move.
- **D-4 Exact-decimal rounding.** `Number(x.toFixed(2))` rounds the true binary value, which every
  engine agrees on. `Math.round(x * 100) / 100` can differ in the last bit.
- **D-5 Round once.** The total is rounded from unrounded pillars. The doc's 97.11 only works this
  way, and a test pins it.
- **D-6 Bad input throws, missing input is a result.** A negative or `NaN` count is an ingestion bug
  and throws with the field name. A metric that was never fetched makes the repository unrated.
  Negative days are clock skew and count as 0.
- **D-7 Compute once, store the tier.** `Math.log10` and `Math.exp` are not required to be correctly
  rounded. Computing the tier only in the Node build and storing it in the ledger means browsers
  never recompute it.
- **D-8 No clock.** Callers pass ages in days. A test scans the source for `Date`, randomness and the
  environment.
- **D-9 No pillar clamp.** Mutation testing showed a clamp on each pillar was unobservable: every
  sub-term is already clamped and the config guarantees the weights sum to 1. It was removed.

## Complexity Tracking

| Choice | Why it is justified |
| :--- | :--- |
| `rateRepository` next to `computeScore` | Makes "unrated" a first-class result so ingestion cannot invent a score |
| A source-scanning test | The only cheap way to enforce "no clock" mechanically |
| A registry to scoring dependency | One owner for the tier vocabulary is simpler than two lists that must match |

## Verified on the way

- All seven worked examples reproduce the numbers in `docs/SCORING.md`.
- 22 hand-made mutants (wrong constants, off-by-one comparisons, dropped clamps and rounding) were all
  caught. The one survivor of the first round led to removing dead code.
