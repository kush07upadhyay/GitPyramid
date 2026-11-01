# Feature Specification: Pyramid Score

**Feature Branch**: `002-pyramid-score`
**Created**: 2026-11-01
**Status**: Implemented. Ingestion and calibration follow in release R1.
**Input**: [PRD](../../docs/PRD.md) requirement SCR-1, [SCORING](../../docs/SCORING.md), [ADR-0004](../../docs/decisions/0004-stable-slots-and-ledger.md), constitution principles III, V and IX.

## User Scenarios and Testing

### User Story 1 - The same repository always gets the same score (Priority: P1)

The build, a maintainer's laptop and CI compute a score for a repository and get identical numbers.

**Why this priority**: constitution principle III. People share links and screenshots, so a size or
label that flickers between runs breaks trust.

**Independent Test**: run the seven worked examples in `docs/SCORING.md` through the package. Every
pillar and total must match to the cent.

**Acceptance Scenarios**:

1. **Given** the Ecosystem giant inputs, **When** scored, **Then** the pillars are 24.62, 23.03,
   24.47 and 25.00 and the total is 97.11 (not 97.12, because rounding happens once).
2. **Given** the same inputs twice, **When** scored, **Then** the results are byte-identical.
3. **Given** any input, **When** the source is scanned, **Then** it never reads a clock or a random
   source.

### User Story 2 - A score maps to one tier and one state, with clear boundaries (Priority: P1)

**Independent Test**: for every boundary in the tables below, test the value just below, on and just
above it.

**Acceptance Scenarios**:

1. **Given** a displayed score of 60.00, **When** the tier is chosen, **Then** it is Structural
   Pillar, even if the raw value was 59.996.
2. **Given** a last commit exactly 365 days ago, **When** the state is derived, **Then** it is not
   weathered. At 366 days it is.
3. **Given** a repository exactly 274 days old, **When** the state is derived, **Then** it is not
   translucent.
4. **Given** a dormant repository that becomes active again, **When** the state is derived, **Then**
   it is solid again. There is no memory.

### User Story 3 - A maintainer changes a constant through a reviewed pull request (Priority: P2)

All constants live in `registry/scoring.config.json`. A bad edit fails loudly, and lists every
problem at once.

**Independent Test**: break the config in each way under Edge Cases. Each must be rejected with the
path of the problem.

**Acceptance Scenarios**:

1. **Given** weights that add up to 1.1, **When** the config is parsed, **Then** it is rejected,
   because the pillar could pass 25 points.
2. **Given** a tier threshold edit, **When** a score is classified, **Then** the new threshold is
   used (the package holds no copy of the constants).

### User Story 4 - Incomplete ingestion never produces a made-up score (Priority: P2)

**Independent Test**: leave out the contributor count. The result is "unrated" and names the metric.

**Acceptance Scenarios**:

1. **Given** a missing or null metric, **When** rated, **Then** the result is `unrated` with the list
   of missing metrics.
2. **Given** a metric that is present but negative, **When** rated, **Then** it throws, because that
   is a bug to fix and not a case to hide.

### User Story 5 - Anyone can check the maths (Priority: P3)

The formula, the config and the tests agree, so a reader or a skeptical contributor can verify that
sponsors and maintainers cannot tilt scores (constitution principle IX).

**Independent Test**: the tests read the real config file. If it drifts from `docs/SCORING.md`, they
fail.

## Edge Cases

Each row maps to a test. Files are in `packages/scoring/src/`.

### Inputs

| Case | Behavior | Test |
| :--- | :--- | :--- |
| Negative, `NaN` or infinite stars, forks, contributors or commits | `RangeError` that names the field | `score.test.ts` "negative, NaN or infinite input throws and names the field" |
| `NaN` or infinite days | `RangeError` that names the field | `score.test.ts` "daysSinceLastCommit", "ageDays" |
| A string where a number belongs | `RangeError` | `score.test.ts` "rejects a value that is not a number at all" |
| Negative or non-numeric issue counts | `RangeError` | `score.test.ts` "rejects issue counts that are negative or not numbers" |
| Impact level 0, 6, 2.5, `NaN`, negative | `RangeError` | `score.test.ts` "rejects impact level" |
| Negative days (clock skew) | Treated as 0 | `score.test.ts` "treats negative days as 0, because of clock skew" |
| Closed issues greater than total | Issue health clamped to 1 | `score.test.ts` "clamps issue health to 1" |
| Issues disabled, or no issues at all | Neutral 0.5, so mirrors such as Linux are not punished | `score.test.ts` "uses the neutral issue health of 0.5", "does not punish a mirror" |
| A metric far above its cap | Full points, never more | `score.test.ts` "gives full points for a metric above its cap" |
| Archived repository | Score still computed. State is weathered | `score.test.ts` "keeps the score of an archived repository computable" |
| Contributor count (or any metric) never fetched | `unrated` with the missing names, no score | `score.test.ts` (unrated repositories) |
| `null` instead of missing | Same as missing | `score.test.ts` "treats null like missing" |
| A wrong value next to a missing one | Still throws | `score.test.ts` "does not hide a wrong value behind unrated" |
| A zero count | Counts as present | `score.test.ts` "counts a zero as present" |

### Rounding, tiers and states

| Case | Behavior | Test |
| :--- | :--- | :--- |
| `1.005`, `2.675`, `0.125`, `59.996` | Rounded from the exact binary value, the same on every engine | `score.test.ts` (rounding) |
| Negative zero, rounding twice | No `-0`. Idempotent | `score.test.ts` (rounding) |
| Total from rounded or unrounded pillars | Unrounded, rounded once | `examples.test.ts` "rounds the total once" |
| Score 39.99, 40, 59.99, 60, 79.99, 80, 0, 100 | Correct tier and cell count | `state-tier.test.ts` (tierForScore) |
| Raw 59.996 | Lands in Structural Pillar | `state-tier.test.ts` "compares the rounded score" |
| Score below 0, above 100, `NaN`, infinite | `RangeError` | `state-tier.test.ts` "rejects a score of" |
| Config edit to a threshold | Takes effect | `state-tier.test.ts` "follows the thresholds in the config" |
| Last commit 364.99, 365 and 366 days ago | Solid, solid, weathered | `state-tier.test.ts` (deriveState) |
| Age 273, 273.99, 274 and 275 days | Translucent, translucent, solid, solid | `state-tier.test.ts` (deriveState) |
| Archived at any age | Weathered | `state-tier.test.ts` "is weathered when archived" |
| New but dormant | Weathered beats translucent (first match wins) | `state-tier.test.ts` "applies the first matching rule" |
| Incubating flag on an old project | Translucent | `state-tier.test.ts` "is translucent when maintainers flag the project" |
| Dormant, then active again | Solid again | `state-tier.test.ts` "is solid again" |
| Battle-tested at 54.99, 55 and 97.11 | False, true, true | `state-tier.test.ts` (battle-tested label) |
| Displayed 55.00 from a raw 54.996 | Qualifies | `state-tier.test.ts` "compares the rounded score" |
| Battle-tested label on weathered or translucent bricks | Never | `state-tier.test.ts` "is never given to a weathered or translucent brick" |
| Active repository over 9 months old with a low score (the gap the plan left) | Solid, not battle-tested | `state-tier.test.ts` "covers the gap the plan left" |

### Config

| Case | Behavior | Test |
| :--- | :--- | :--- |
| The real config file | Parses and matches the doc's constants | `config.test.ts` (the real registry/scoring.config.json) |
| Not an object, empty, `null` | Rejected | `config.test.ts` |
| Unknown key | Rejected | `config.test.ts` "rejects unknown keys" |
| Weights not adding to 1, in any pillar | Rejected | `config.test.ts` |
| Weights adding to 1 within float error | Accepted | `config.test.ts` "accepts weights that add up to 1 within float error" |
| Log cap of 0 or negative, decay of 0 or negative | Rejected | `config.test.ts` |
| Neutral issue health outside 0 to 1 | Rejected | `config.test.ts` |
| First tier not starting at 0, tiers not increasing, tiers out of order, a tier added or removed, a threshold over 100 | Rejected | `config.test.ts` (tiers) |
| Several problems at once | All listed | `config.test.ts` "lists every problem at once" |

### Properties and purity

| Case | Behavior | Test |
| :--- | :--- | :--- |
| Any input | Pillars from 0 to 25, total from 5 to 100 | `score.test.ts` "keeps every pillar from 0 to 25" (2,000 seeded samples) |
| More stars, forks, contributors, commits, age or closed issues | Score never drops | `score.test.ts` "never lowers the score when" |
| An older last commit | Score never rises | `score.test.ts` "never raises the score when the last commit gets older" |
| Impact levels 1 to 5 | Exactly 5, 10, 15, 20, 25 points | `score.test.ts` "gives each impact level exactly 5 more points" |
| Same input twice | Identical output | `score.test.ts` "is deterministic" |
| Source mentions the clock or randomness | Test fails | `score.test.ts` (purity) |
| The ledger's tier enum drifts from the scoring package | Test fails | `packages/registry/src/schema-sync.test.ts` "accepts exactly the tiers the scoring package can produce" |

## Requirements

### Functional Requirements

- **FR-001**: `computeScore(metrics, level, config)` implements the formula in [SCORING](../../docs/SCORING.md) as a pure function.
- **FR-002**: The total is rounded once from the unrounded pillars. Thresholds compare against the rounded score.
- **FR-003**: `deriveState` applies the first matching rule: weathered, translucent, solid. Boundaries are strict. `battleTested` is a label on solid bricks only.
- **FR-004**: `tierForScore` returns the tier with its dimensions and cell count. The four tier ids are a fixed vocabulary shared with the ledger.
- **FR-005**: `parseScoringConfig` validates the config and reports every problem at once.
- **FR-006**: `rateRepository` returns `unrated` with the missing metrics instead of guessing.
- **FR-007**: Nothing in the package reads the clock, a random source or the environment.
- **FR-008**: The constants live only in `registry/scoring.config.json`. The package holds no copy.
- **FR-009**: Changing a constant is a reviewed pull request with an ADR. It affects only bricks admitted afterwards.

### Key Entities

- **Metrics**: stars, forks, contributors, commits in the last year, days since the last commit, age in days, and issue counts.
- **ScoreBreakdown**: four pillars and the total, each rounded for display.
- **ScoringConfig**: weights, caps, windows, state thresholds and tier thresholds, with a version.
- **State**: weathered, translucent or solid, plus the battle-tested label.
- **TierInfo**: id, name, dimensions and cells.

## Success Criteria

- **SC-001**: All seven worked examples match `docs/SCORING.md` exactly (`examples.test.ts`).
- **SC-002**: Every edge case above maps to a passing test. `pnpm check` is green.
- **SC-003**: The tests catch regressions. A manual check broke 22 constants and comparisons one at a time (a wrong cap, `>` against `>=`, a dropped clamp, skipped rounding and so on) and every one made at least one test fail. One unobservable clamp the first round exposed was removed instead of kept.
- **SC-004**: Scoring, state and tier for one repository take about 2 microseconds (measured over 200,000 repositories: 415 ms), so a 50,000 brick ingestion spends about 0.1 s on maths.

## Assumptions

- Ingestion (R1) supplies the metrics and the commit-based figures. `pushedAt` is not used, because it moves on any branch.
- The Node build computes scores and the ledger stores the tier chosen at admission. Browsers never recompute a tier, so differences in the last bit of `Math.log10` or `Math.exp` between engines cannot move a brick.
- The tier thresholds are provisional until the Seed 500 calibration.

## Out of Scope

| Item | Where it goes |
| :--- | :--- |
| Fetching metrics from GitHub and the metrics snapshot | PRD SCR-2, R1 |
| Choosing final tier thresholds from the Seed 500 | PRD SCR-3, R1, with an ADR and a published histogram |
| Writing `tier` to the ledger | Admission step and the calibration migration |
| Placing a brick in a slot | Layout spec (004) |
| Growth-spike alerts | Ingestion. The score never reacts automatically |

## Open Questions

- **OQ-04** (carried over): confirm that battle-tested is a label on solid bricks and not a state. See
  [SCORING](../../docs/SCORING.md#states).
