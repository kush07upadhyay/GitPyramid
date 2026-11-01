# Tasks: Pyramid Score

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Legend: `[x]` done on this branch, `[ ]` later.

## Phase 1: Config

- [x] T001 `registry/scoring.config.json` with the constants from `docs/SCORING.md`
- [x] T002 Config schema with weight sums, ordered tiers and strict keys (`config.ts`)
- [x] T003 `config.test.ts`, including the real file

## Phase 2: Score (User Stories 1 and 4)

- [x] T010 Rounding and input checks (`numbers.ts`)
- [x] T011 `issueHealth` and `computeScore` (`score.ts`)
- [x] T012 `rateRepository` and the unrated result
- [x] T013 Worked examples as data and tests (`examples.ts`, `examples.test.ts`)
- [x] T014 Edge cases, properties and the purity scan (`score.test.ts`)

## Phase 3: State and tier (User Story 2)

- [x] T020 `deriveState` with strict boundaries and the battle-tested label (`state.ts`)
- [x] T021 `tierForScore` with the fixed tier vocabulary (`tiers.ts`)
- [x] T022 `state-tier.test.ts`

## Phase 4: Integration and docs (User Stories 3 and 5)

- [x] T030 Registry imports the tier vocabulary from the scoring package, with a test
- [x] T031 `docs/SCORING.md` implementation notes
- [x] T032 Spec, plan and tasks (this folder)
- [x] T033 Mutation check of 22 constants and comparisons

## Later, tracked elsewhere

- [ ] T040 Ingestion job that produces the metrics snapshot (PRD SCR-2, R1)
- [ ] T041 Seed 500 calibration and an ADR for the final thresholds (PRD SCR-3, R1)
- [ ] T042 Record `tier` in the ledger at admission (admission bot, R3)
- [ ] T043 Confirm battle-tested as a label (OQ-04)

## Dependencies

T001 and T002 first. T011 needs T010 and T002. T020 and T021 need T002. T013 needs T011, T020 and
T021. T030 needs T021.
