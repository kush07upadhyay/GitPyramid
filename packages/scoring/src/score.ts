import type { ScoringConfig } from "./config";
import { assertCount, clamp01, days, round2 } from "./numbers";

/** 1 to 5, from the impact rubric in docs/SCORING.md. Held in the maintainer-owned ledger. */
export type ImpactLevel = 1 | 2 | 3 | 4 | 5;
export const IMPACT_LEVELS: readonly ImpactLevel[] = [1, 2, 3, 4, 5];

export interface IssueStats {
  /** False when the repository has issues turned off. */
  enabled: boolean;
  total: number;
  closed: number;
}

export interface Metrics {
  stars: number;
  forks: number;
  /** Human contributors. Bots are excluded by ingestion. */
  contributors: number;
  /** Commits to the default branch in the last 365 days. */
  commitsLastYear: number;
  /** Days since the last commit to the default branch. Not `pushedAt`, which moves on any branch. */
  daysSinceLastCommit: number;
  /** Days since the repository was created. */
  ageDays: number;
  issues: IssueStats;
}

export interface ScoreBreakdown {
  popularity: number;
  community: number;
  stability: number;
  impact: number;
  /** Rounded once, from the unrounded pillars. */
  total: number;
}

/**
 * Issue health `H`: closed issues divided by all issues, from 0 to 1.
 *
 * Repositories with issues turned off, or with no issues at all, get the neutral value, so mirrors
 * such as the Linux kernel are not punished. More closed than total (a counting race) counts as 1.
 */
export function issueHealth(issues: IssueStats, config: ScoringConfig): number {
  assertCount("issues.total", issues.total);
  assertCount("issues.closed", issues.closed);
  if (!issues.enabled || issues.total === 0) return config.stability.neutralIssueHealth;
  return clamp01(issues.closed / issues.total);
}

function assertImpactLevel(level: unknown): asserts level is ImpactLevel {
  if (typeof level !== "number" || !Number.isInteger(level) || level < 1 || level > 5) {
    throw new RangeError(`impact level must be a whole number from 1 to 5 (got ${String(level)}).`);
  }
}

/**
 * Each of the four pillars is worth at most 25 points. No clamp is needed on a pillar itself: every
 * sub-term is clamped to 0 to 1, and the config schema rejects weights that do not add up to 1.
 */
const PILLAR_MAX = 25;

/**
 * The Pyramid Score from 0 to 100. A pure function of its arguments: it never reads the clock, so
 * the caller passes ages in days.
 *
 * Throws `RangeError` for negative, missing, NaN or infinite counts. That is an ingestion bug, and a
 * silent zero would hide it.
 */
export function computeScore(
  metrics: Metrics,
  level: ImpactLevel,
  config: ScoringConfig,
): ScoreBreakdown {
  assertCount("stars", metrics.stars);
  assertCount("forks", metrics.forks);
  assertCount("contributors", metrics.contributors);
  assertCount("commitsLastYear", metrics.commitsLastYear);
  const sinceCommit = days("daysSinceLastCommit", metrics.daysSinceLastCommit);
  const age = days("ageDays", metrics.ageDays);
  assertImpactLevel(level);
  const health = issueHealth(metrics.issues, config);

  const { popularity: pop, community: com, stability: sta } = config;

  const popularity =
    PILLAR_MAX *
    (pop.weights.stars * clamp01(Math.log10(metrics.stars + 1) / pop.logCaps.stars) +
      pop.weights.forks * clamp01(Math.log10(metrics.forks + 1) / pop.logCaps.forks));
  const community =
    PILLAR_MAX *
    (com.weights.contributors *
      clamp01(Math.log10(metrics.contributors + 1) / com.logCaps.contributors) +
      com.weights.commits * clamp01(Math.log10(metrics.commitsLastYear + 1) / com.logCaps.commits));
  const stability =
    PILLAR_MAX *
    (sta.weights.recency * Math.exp(-sinceCommit / sta.recencyDecayDays) +
      sta.weights.maturity * Math.min(1, age / sta.maturityDays) +
      sta.weights.issueHealth * health);
  const impact = PILLAR_MAX * (level / IMPACT_LEVELS.length);

  return {
    popularity: round2(popularity),
    community: round2(community),
    stability: round2(stability),
    impact: round2(impact),
    total: round2(popularity + community + stability + impact),
  };
}

export type MetricName = keyof Metrics;

/** Metrics as ingestion may deliver them, with anything it failed to fetch left out or null. */
export type PartialMetrics = { [K in keyof Metrics]?: Metrics[K] | null | undefined };

export type Rating =
  | { status: "rated"; score: ScoreBreakdown }
  | { status: "unrated"; missing: MetricName[] };

const REQUIRED: readonly MetricName[] = [
  "stars",
  "forks",
  "contributors",
  "commitsLastYear",
  "daysSinceLastCommit",
  "ageDays",
  "issues",
];

/**
 * Score a repository whose ingestion may have been incomplete. A repository with any metric
 * missing is "unrated" and must not be given a slot until ingestion succeeds. That is different
 * from a metric that is present but wrong, which still throws.
 */
export function rateRepository(
  metrics: PartialMetrics,
  level: ImpactLevel,
  config: ScoringConfig,
): Rating {
  const missing = REQUIRED.filter((name) => metrics[name] === undefined || metrics[name] === null);
  if (missing.length > 0) return { status: "unrated", missing };
  return { status: "rated", score: computeScore(metrics as Metrics, level, config) };
}
