import type { ScoringConfig } from "./config";
import { assertScore, days, round2 } from "./numbers";

/** Drives color and opacity only. A brick never moves because its state changed. */
export type State = "weathered" | "translucent" | "solid";

export interface StateInput {
  archived: boolean;
  /** Days since the last commit to the default branch. */
  daysSinceLastCommit: number;
  /** Days since the repository was created. */
  ageDays: number;
  /** Set by maintainers in the ledger for young projects they want shown as translucent. */
  incubating?: boolean | undefined;
  /** The rounded Pyramid Score. Only used for the battle-tested label. */
  score: number;
}

export interface StateResult {
  state: State;
  /** A Solid brick with a high score. A label, not a state. */
  battleTested: boolean;
}

/**
 * Derive the live state. The first matching rule wins:
 *
 * 1. Weathered: archived, or no commit for more than 365 days.
 * 2. Translucent: younger than 274 days (9 months), or flagged as incubating.
 * 3. Solid: everything else.
 *
 * Boundaries are strict: exactly 365 days is not weathered and exactly 274 days is not translucent.
 * There is no memory, so a weathered repository that becomes active again is solid again.
 */
export function deriveState(input: StateInput, config: ScoringConfig): StateResult {
  const sinceCommit = days("daysSinceLastCommit", input.daysSinceLastCommit);
  const age = days("ageDays", input.ageDays);
  assertScore("score", input.score);

  const { weatheredAfterDays, translucentUnderDays, battleTestedMinScore } = config.states;

  if (input.archived || sinceCommit > weatheredAfterDays) {
    return { state: "weathered", battleTested: false };
  }
  if (age < translucentUnderDays || input.incubating === true) {
    return { state: "translucent", battleTested: false };
  }
  return { state: "solid", battleTested: round2(input.score) >= battleTestedMinScore };
}
