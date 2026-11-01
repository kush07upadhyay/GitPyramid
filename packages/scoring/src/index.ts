export { parseScoringConfig, type ScoringConfig, ScoringConfigSchema } from "./config";
export { round2 } from "./numbers";
export {
  computeScore,
  IMPACT_LEVELS,
  type ImpactLevel,
  type IssueStats,
  issueHealth,
  type MetricName,
  type Metrics,
  type PartialMetrics,
  type Rating,
  rateRepository,
  type ScoreBreakdown,
} from "./score";
export { deriveState, type State, type StateInput, type StateResult } from "./state";
export { TIER_IDS, type TierId, type TierInfo, tierForScore } from "./tiers";
