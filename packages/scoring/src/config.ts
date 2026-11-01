import { z } from "zod";
import { TIER_IDS } from "./tiers";

const share = z.number().min(0).max(1);
const positive = z.number().positive();

/** Weights inside one pillar must add up to 1, or the pillar could exceed its 25 points. */
const WEIGHT_SUM_TOLERANCE = 1e-9;

function addsUpToOne(values: number[]): boolean {
  return Math.abs(values.reduce((sum, value) => sum + value, 0) - 1) <= WEIGHT_SUM_TOLERANCE;
}

export const ScoringConfigSchema = z
  .strictObject({
    version: z.number().int().positive(),
    popularity: z.strictObject({
      weights: z.strictObject({ stars: share, forks: share }),
      logCaps: z.strictObject({ stars: positive, forks: positive }),
    }),
    community: z.strictObject({
      weights: z.strictObject({ contributors: share, commits: share }),
      logCaps: z.strictObject({ contributors: positive, commits: positive }),
    }),
    stability: z.strictObject({
      weights: z.strictObject({ recency: share, maturity: share, issueHealth: share }),
      recencyDecayDays: positive,
      maturityDays: positive,
      neutralIssueHealth: share,
    }),
    states: z.strictObject({
      weatheredAfterDays: positive,
      translucentUnderDays: positive,
      battleTestedMinScore: z.number().min(0).max(100),
    }),
    tiers: z
      .array(
        z.strictObject({
          id: z.enum(TIER_IDS),
          name: z.string().min(1).max(40),
          minScore: z.number().min(0).max(100),
        }),
      )
      .length(TIER_IDS.length),
  })
  .superRefine((config, ctx) => {
    const pillars = [
      ["popularity", Object.values(config.popularity.weights)],
      ["community", Object.values(config.community.weights)],
      ["stability", Object.values(config.stability.weights)],
    ] as const;
    for (const [name, weights] of pillars) {
      if (!addsUpToOne(weights)) {
        ctx.addIssue({
          code: "custom",
          path: [name, "weights"],
          message: "weights must add up to 1, otherwise the pillar can exceed 25 points.",
        });
      }
    }

    config.tiers.forEach((tier, i) => {
      if (tier.id !== TIER_IDS[i]) {
        ctx.addIssue({
          code: "custom",
          path: ["tiers", i, "id"],
          message: `tiers must be listed in this order: ${TIER_IDS.join(", ")}.`,
        });
      }
      const previous = config.tiers[i - 1];
      if (i === 0 && tier.minScore !== 0) {
        ctx.addIssue({
          code: "custom",
          path: ["tiers", 0, "minScore"],
          message: "the first tier must start at 0, or low scores would have no tier.",
        });
      }
      if (previous !== undefined && tier.minScore <= previous.minScore) {
        ctx.addIssue({
          code: "custom",
          path: ["tiers", i, "minScore"],
          message: "each tier must start at a higher score than the one before it.",
        });
      }
    });
  });

export type ScoringConfig = z.infer<typeof ScoringConfigSchema>;

/** Validate a parsed `registry/scoring.config.json`. Throws one error that lists every problem. */
export function parseScoringConfig(raw: unknown): ScoringConfig {
  const result = ScoringConfigSchema.safeParse(raw);
  if (result.success) return result.data;
  const lines = result.error.issues.map(
    (issue) => `  - ${issue.path.join(".") || "config"}: ${issue.message}`,
  );
  throw new Error(`Invalid scoring config:\n${lines.join("\n")}`);
}
