import type { ScoringConfig } from "./config";
import { assertScore, round2 } from "./numbers";

/** The four size tiers, from smallest to largest. The ledger stores these ids. */
export const TIER_IDS = ["1x1x1", "2x1x1", "2x2x1", "2x2x2"] as const;
export type TierId = (typeof TIER_IDS)[number];

export interface TierInfo {
  id: TierId;
  name: string;
  /** Width, depth and height in cells. */
  dimensions: readonly [number, number, number];
  /** Number of lattice cells the brick occupies. */
  cells: number;
}

const DIMENSIONS: Record<TierId, readonly [number, number, number]> = {
  "1x1x1": [1, 1, 1],
  "2x1x1": [2, 1, 1],
  "2x2x1": [2, 2, 1],
  "2x2x2": [2, 2, 2],
};

/**
 * Pick the size tier for a score at admission.
 *
 * Thresholds compare against the score rounded to 2 decimals, so a displayed 60.00 always lands in
 * the 60 tier. Rounding twice changes nothing, so already rounded scores are safe to pass in.
 */
export function tierForScore(score: number, config: ScoringConfig): TierInfo {
  assertScore("score", score);
  const rounded = round2(score);
  const tier = config.tiers.findLast((candidate) => rounded >= candidate.minScore);
  if (tier === undefined) {
    throw new RangeError(`No tier covers a score of ${rounded}. The first tier must start at 0.`);
  }
  const dimensions = DIMENSIONS[tier.id];
  return {
    id: tier.id,
    name: tier.name,
    dimensions,
    cells: dimensions[0] * dimensions[1] * dimensions[2],
  };
}
