# Pyramid Score

Status: Draft, provisional constants | Config: [registry/scoring.config.json](../registry/scoring.config.json) |
Code: [packages/scoring](../packages/scoring) | Spec: [specs/002-pyramid-score](../specs/002-pyramid-score/spec.md)

The Pyramid Score `P` rates a repository from 0 to 100. It decides a brick's size tier when it is
admitted, and its label afterwards. It never decides a brick's position after admission (see
[ADR-0004](decisions/0004-stable-slots-and-ledger.md)), and sponsors can never influence it
(constitution principle IX).

## Formula

`P` is the sum of four pillars. Each pillar is worth at most 25 points.

```text
clamp01(x)  = min(1, max(0, x))

Popularity  = 25 * ( 0.7 * clamp01( log10(S + 1) / 5.5 )
                   + 0.3 * clamp01( log10(F + 1) / 4.5 ) )

Community   = 25 * ( 0.6 * clamp01( log10(C + 1) / 3.5 )
                   + 0.4 * clamp01( log10(M + 1) / 3.5 ) )

Stability   = 25 * ( 0.5 * exp(-d / 365)
                   + 0.3 * min(1, age / 730)
                   + 0.2 * H )

Impact      = 25 * ( level / 5 )

P           = round2( Popularity + Community + Stability + Impact )
```

| Symbol | Meaning |
| :--- | :--- |
| `S`, `F` | Stars and forks. |
| `C` | Human contributors. Excludes accounts of type Bot and logins ending in `[bot]`. |
| `M` | Commits to the default branch in the last 365 days. |
| `d` | Days since the last commit to the default branch. Not `pushedAt`, which moves on any branch. |
| `age` | Days since the repository was created. |
| `H` | Issue health: closed issues divided by all issues, clamped to 0 to 1. |
| `level` | Impact rubric level, 1 to 5. Held in the maintainer-owned ledger. |

Why logarithms: GitHub metrics follow a power law. Flagship projects have 250,000 or more stars and
vital libraries have 2,000. Logs keep both on the same page.

Why clamps: without them a repository with 600,000 stars and 60,000 forks scores 26.35 out of 25
in popularity. Each sub-term is clamped, so a pillar can never exceed 25.

All constants live in `registry/scoring.config.json` and carry a `version`. Changing one is a
reviewed change with an ADR, and it only affects bricks admitted after the change.

## Impact rubric

Impact is a judgment, so it is a small rubric and it is owned by maintainers. Contributors never
set it. Reviewers may argue for a level in the pull request.

| Level | Points | Meaning |
| :--- | :--- | :--- |
| 5 | 25 | Defines its ecosystem. Most projects in the area depend on it or imitate it. |
| 4 | 20 | The standard choice in its niche. |
| 3 | 15 | Strong and widely used, with close alternatives. |
| 2 | 10 | Useful and focused. |
| 1 | 5 | Emerging or narrow reach. |

If a new repository duplicates an existing brick without a different trade-off (language runtime,
edge support, memory footprint), it becomes an entry in the existing brick's `alternatives` list
instead of a new brick.

## States

State is derived from live data and drives color and opacity only. The first matching rule wins.

| Order | State | Rule |
| :--- | :--- | :--- |
| 1 | Weathered | Archived, or `d` greater than 365. |
| 2 | Translucent | `age` under 274 days (9 months), or the ledger marks it `incubating`. |
| 3 | Solid | Everything else. |

A Solid brick with `P` of at least 55 also gets the label **battle-tested**. The plan tied Solid to
`P >= 55`, which left active repositories older than 9 months with a lower score without a state
([F-04](PLAN_REVIEW.md#f-04-the-state-model-has-a-gap-medium)). Treating battle-tested as a label
closes the gap. Needs founder confirmation (OQ-04).

Boundaries are strict: `d` of exactly 365 is not Weathered, and `age` of exactly 274 is not
Translucent. A Weathered repository that becomes active again is Solid again. Its slot never moves.

## Size tiers

The tier is chosen once, at admission, from the rounded score. Thresholds are provisional. They are
calibrated on the Seed 500 so the mix is near 50% small, 30% standard, 15% pillar and 5%
foundation, then frozen for the whole Epoch.

| Tier | Size | Cells | Score at admission |
| :--- | :--- | :--- | :--- |
| Modular Unit | 1x1x1 | 1 | under 40 |
| Standard Ashlar | 2x1x1 | 2 | 40 to under 60 |
| Structural Pillar | 2x2x1 | 4 | 60 to under 80 |
| Foundation Core | 2x2x2 | 8 | 80 or more |

Thresholds compare against the rounded score, so a displayed 60.00 always lands in Pillar.

## Worked examples

These are asserted in the unit tests. They are archetypes, not real repositories.

| Archetype | S | F | C | M | d | age | H | level | Pop | Com | Stab | Imp | Total | State | Tier |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- | :--- |
| Ecosystem giant | 240000 | 50000 | 1800 | 1500 | 1 | 4500 | 0.9 | 5 | 24.62 | 23.03 | 24.47 | 25.00 | 97.11 | Solid | Foundation Core |
| Healthy library | 5000 | 500 | 40 | 200 | 10 | 1460 | 0.8 | 3 | 16.27 | 13.49 | 23.66 | 15.00 | 68.42 | Solid | Structural Pillar |
| Niche library | 500 | 50 | 5 | 30 | 30 | 547 | 0.7 | 2 | 11.44 | 7.60 | 20.63 | 10.00 | 49.67 | Solid | Standard Ashlar |
| Rising tool | 3000 | 200 | 12 | 400 | 2 | 120 | 0.6 | 3 | 14.90 | 12.21 | 16.66 | 15.00 | 58.78 | Translucent | Standard Ashlar |
| Dormant legacy | 20000 | 3000 | 150 | 5 | 500 | 3000 | 0.5 | 3 | 19.48 | 11.56 | 13.18 | 15.00 | 59.22 | Weathered | Standard Ashlar |
| Over the caps | 600000 | 60000 | 5000 | 9000 | 0 | 4000 | 1.0 | 5 | 25.00 | 25.00 | 25.00 | 25.00 | 100.00 | Solid | Foundation Core |
| Brand new, empty | 0 | 0 | 0 | 0 | 0 | 0 | 0.5 | 1 | 0.00 | 0.00 | 15.00 | 5.00 | 20.00 | Translucent | Modular Unit |

The "Niche library" row is the case that exposed the state gap. It is active, 18 months old and
scores 49.67.

## Edge cases

| Case | Rule |
| :--- | :--- |
| Negative, `NaN` or infinite input | Throw a `RangeError` that names the field. It is an ingestion bug, and a silent zero would hide it. |
| `d` or `age` below zero (clock skew) | Treated as 0. |
| Closed issues greater than total issues | `H` is clamped to 1. |
| Issues disabled, or zero issues in total | `H` is 0.5, so mirrors such as the Linux kernel are not punished. |
| Archived repository | State is Weathered. The score is still computed and shown. |
| Metric above its cap | Full points for that term. |
| Contributor count never fetched | The repository is "unrated" and is not given a slot until ingestion succeeds. |
| Renamed or moved repository | Ingestion follows the redirect. The manifest must be updated to the new name (CI warns). |
| Rounding | Scores are rounded to 2 decimals once, and thresholds use the rounded value. No clock reads inside pure functions: the caller passes `d` and `age`. |

## Gaming and abuse

The log scale and the 25-point cap on popularity mean fake stars buy at most 17.5 points. Other
defenses:

- Human-contributor filtering and a commit window stop bot padding.
- Impact is maintainer-owned, so self-rating is impossible.
- Ingestion records growth spikes (for example stars up tenfold in a week) so maintainers can
  review the brick. The score does not react automatically.
- Weights are versioned. If a loophole appears, the fix is a new config version and it applies
  forward.

## Calibration plan

1. Run ingestion with a read-only token over the Seed 500 and store the raw metrics outside the repo.
2. Compute scores with config version 1 and plot the distribution.
3. Choose tier thresholds that give about 50 / 30 / 15 / 5. Record the choice in an ADR.
4. Freeze them for Epoch I and publish the histogram in the repository.

## Implementation notes

The code is in [packages/scoring](../packages/scoring) and the constants are in
[registry/scoring.config.json](../registry/scoring.config.json). Every worked example above is a test
(`examples.test.ts`) and every row of the edge-case table maps to one in
[spec 002](../specs/002-pyramid-score/spec.md).

- **Config shape.** Weights, log caps, decay and maturity windows, state thresholds and the four tier
  thresholds. The config is validated on load: weights inside a pillar must add up to 1 (otherwise a
  pillar could pass 25 points), tiers start at 0 and strictly increase, and unknown keys are
  rejected so a typo cannot silently do nothing.
- **The tier ids are not configurable.** `1x1x1`, `2x1x1`, `2x2x1` and `2x2x2` are the vocabulary
  that the ledger stores. Only their thresholds and names can change.
- **Rounding is deterministic.** `round2` uses the exact decimal value of the double (`toFixed`), so
  `1.005` rounds to `1.00` on every engine, because the stored number is slightly below 1.005.
  Rounding happens once, on the total, from the unrounded pillars. The pillars shown are rounded
  separately for display, so they may not add up to the total by 0.01. The Ecosystem giant row is an
  example: 24.62 + 23.03 + 24.47 + 25.00 is 97.12, and the total is 97.11.
- **Scores are computed in one place.** `Math.log10` and `Math.exp` may differ in the last bit between
  JavaScript engines. The tier is therefore chosen once, in the Node build, and stored in the
  ledger. Browsers never recompute a tier, so a one-bit difference cannot move a brick.
- **Unrated is a result, not an error.** `rateRepository` returns the list of missing metrics when
  ingestion was incomplete. A metric that is present but wrong (negative, `NaN`, infinite) throws a
  `RangeError` that names the field, because that is a bug to fix and not a case to hide.
- **No clock, no randomness.** A test scans the source and fails if it mentions `Date`,
  `Math.random`, `performance.now` or `process.env`. Callers pass ages in days.
