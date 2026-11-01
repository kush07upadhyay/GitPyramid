import { readFileSync } from "node:fs";
import { type Metrics, parseScoringConfig, type ScoringConfig } from "./index";

/** The real `registry/scoring.config.json`, so tests fail if the file and the docs disagree. */
export const config: ScoringConfig = parseScoringConfig(
  JSON.parse(
    readFileSync(new URL("../../../registry/scoring.config.json", import.meta.url), "utf8"),
  ),
);

export function metrics(over: Partial<Metrics> = {}): Metrics {
  return {
    stars: 5000,
    forks: 500,
    contributors: 40,
    commitsLastYear: 200,
    daysSinceLastCommit: 10,
    ageDays: 1460,
    issues: { enabled: true, total: 100, closed: 80 },
    ...over,
  };
}
