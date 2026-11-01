import { describe, expect, it } from "vitest";
import { EXAMPLES } from "./examples";
import { computeScore, deriveState, round2, tierForScore } from "./index";
import { config, metrics } from "./test-helpers";

describe("worked examples from docs/SCORING.md", () => {
  it.each(EXAMPLES)("$name", (example) => {
    const score = computeScore(
      metrics({
        stars: example.stars,
        forks: example.forks,
        contributors: example.contributors,
        commitsLastYear: example.commits,
        daysSinceLastCommit: example.daysSinceCommit,
        ageDays: example.ageDays,
        issues: { enabled: true, total: 100, closed: example.closed },
      }),
      example.level,
      config,
    );
    expect([score.popularity, score.community, score.stability, score.impact]).toEqual(
      example.pillars,
    );
    expect(score.total).toBe(example.total);

    const { state } = deriveState(
      {
        archived: false,
        daysSinceLastCommit: example.daysSinceCommit,
        ageDays: example.ageDays,
        score: score.total,
      },
      config,
    );
    expect(state).toBe(example.state);
    expect(tierForScore(score.total, config).id).toBe(example.tier);
  });

  it("rounds the total once, from the unrounded pillars", () => {
    const giant = EXAMPLES[0];
    expect(giant?.name).toBe("Ecosystem giant");
    const score = computeScore(
      metrics({
        stars: 240000,
        forks: 50000,
        contributors: 1800,
        commitsLastYear: 1500,
        daysSinceLastCommit: 1,
        ageDays: 4500,
        issues: { enabled: true, total: 100, closed: 90 },
      }),
      5,
      config,
    );
    // Adding the rounded pillars would give 97.12, which is why rounding happens only once.
    expect(round2(score.popularity + score.community + score.stability + score.impact)).toBe(97.12);
    expect(score.total).toBe(97.11);
  });

  it("covers the whole range of tiers and states", () => {
    expect(new Set(EXAMPLES.map((e) => e.tier)).size).toBe(4);
    expect(new Set(EXAMPLES.map((e) => e.state)).size).toBe(3);
  });
});
