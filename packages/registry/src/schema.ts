import { z } from "zod";

export const SECTORS = ["systems", "frontend", "backend", "ai", "devops"] as const;
export type Sector = (typeof SECTORS)[number];

export const TIERS = ["1x1x1", "2x1x1", "2x2x1", "2x2x2"] as const;
export type Tier = (typeof TIERS)[number];

export const LIMITS = {
  maxFileBytes: 8 * 1024,
  nameMax: 60,
  problemMin: 20,
  problemMax: 160,
  techStackMax: 8,
  websiteMax: 200,
  compatibleMax: 12,
  alternativesMax: 8,
} as const;

// GitHub logins use letters, digits and single hyphens, never start or end with a hyphen, and are
// at most 39 characters. Repository names use letters, digits, dot, hyphen and underscore, up to
// 100 characters. Registry paths are all lowercase.
export const OWNER_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/;
export const REPO_NAME_PATTERN = /^[a-z0-9._-]{1,100}$/;
export const REPO_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}\/[a-z0-9._-]{1,100}$/;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const TAG_PATTERN = /^[a-z0-9][a-z0-9+#.-]{0,29}$/;

export const BRICK_SCHEMA_REF = "../../schema/brick.schema.json";

const repoRef = z.string().regex(REPO_PATTERN);

export const BrickSchema = z.strictObject({
  $schema: z.string().max(200).optional(),
  schemaVersion: z.literal(1),
  repo: z.string().regex(REPO_PATTERN),
  name: z.string().min(1).max(LIMITS.nameMax),
  sector: z.enum(SECTORS),
  category: z.string().regex(SLUG_PATTERN).max(48),
  problemSolved: z.string().min(LIMITS.problemMin).max(LIMITS.problemMax).regex(/\.$/),
  techStack: z.array(z.string().regex(TAG_PATTERN)).min(1).max(LIMITS.techStackMax),
  license: z.string().min(1).max(120),
  website: z.string().max(LIMITS.websiteMax).optional(),
  compatibleWith: z.array(repoRef).max(LIMITS.compatibleMax).optional(),
  alternatives: z.array(repoRef).max(LIMITS.alternativesMax).optional(),
});
export type Brick = z.infer<typeof BrickSchema>;

export const LedgerEntrySchema = z.strictObject({
  id: z.number().int().positive(),
  repo: z.string().regex(REPO_PATTERN),
  githubId: z.number().int().positive().optional(),
  admitted: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  by: z
    .string()
    .regex(/^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/)
    .optional(),
  impact: z.number().int().min(1).max(5),
  tier: z.enum(TIERS).optional(),
  incubating: z.boolean().optional(),
  retired: z.boolean().optional(),
});
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

export const TaxonomySchema = z.strictObject({
  version: z.literal(1),
  sectors: z
    .array(
      z.strictObject({
        id: z.enum(SECTORS),
        label: z.string().min(1).max(80),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        categories: z
          .array(
            z.strictObject({
              id: z.string().regex(SLUG_PATTERN).max(48),
              label: z.string().min(1).max(80),
              description: z.string().min(1).max(200),
            }),
          )
          .min(1),
      }),
    )
    .length(SECTORS.length),
});
export type Taxonomy = z.infer<typeof TaxonomySchema>;

/** Fields that exist in the plan's manifest but are computed or maintainer-owned here. */
export const DERIVED_FIELDS: Record<string, string> = {
  id: "ids are assigned by maintainers in registry/ledger.jsonl",
  pScore: "scores are computed from live GitHub data",
  score: "scores are computed from live GitHub data",
  state: "the state is computed from live GitHub data",
  layer: "positions are assigned by the layout engine",
  gridCoord: "positions are assigned by the layout engine",
  dimensions: "the size tier is chosen by maintainers at admission",
  tier: "the size tier is chosen by maintainers at admission",
  impact: "impact levels are set by maintainers",
  stars: "stars change daily and are fetched from GitHub",
  forks: "forks change daily and are fetched from GitHub",
  contributors: "contributor counts are fetched from GitHub",
  incubating: "this flag is set by maintainers in the ledger",
  githubUrl: "the URL is derived from the repo field",
  url: "the URL is derived from the repo field",
};
