import { describe, expect, it } from "vitest";
import { parseScoringConfig } from "./index";
import { config } from "./test-helpers";

// The tests below build deliberately invalid configs, so they need to poke at any shape.
// biome-ignore lint/suspicious/noExplicitAny: test-only, see above
const clone = () => structuredClone(config) as Record<string, any>;

describe("the real registry/scoring.config.json", () => {
  it("parses and carries a version", () => {
    expect(config.version).toBe(1);
  });

  it("matches the constants written in docs/SCORING.md", () => {
    expect(config.popularity).toEqual({
      weights: { stars: 0.7, forks: 0.3 },
      logCaps: { stars: 5.5, forks: 4.5 },
    });
    expect(config.community).toEqual({
      weights: { contributors: 0.6, commits: 0.4 },
      logCaps: { contributors: 3.5, commits: 3.5 },
    });
    expect(config.stability).toMatchObject({
      weights: { recency: 0.5, maturity: 0.3, issueHealth: 0.2 },
      recencyDecayDays: 365,
      maturityDays: 730,
    });
    expect(config.states).toEqual({
      weatheredAfterDays: 365,
      translucentUnderDays: 274,
      battleTestedMinScore: 55,
    });
    expect(config.tiers.map((t) => t.minScore)).toEqual([0, 40, 60, 80]);
  });
});

describe("parseScoringConfig", () => {
  it("returns the same config for valid input", () => {
    expect(parseScoringConfig(clone())).toEqual(config);
  });

  it.each([null, undefined, 5, "text", [], {}])("rejects %j", (raw) => {
    expect(() => parseScoringConfig(raw)).toThrow("Invalid scoring config");
  });

  it("rejects unknown keys, so a typo cannot silently do nothing", () => {
    const c = clone();
    c.popularity.weight = {};
    expect(() => parseScoringConfig(c)).toThrow("popularity");
  });

  it.each(["popularity", "community"] as const)(
    "rejects %s weights that do not add up to 1, because the pillar could pass 25 points",
    (pillar) => {
      const c = clone();
      const first = Object.keys(c[pillar].weights)[0] as string;
      c[pillar].weights[first] += 0.1;
      expect(() => parseScoringConfig(c)).toThrow(`${pillar}.weights`);
    },
  );

  it("rejects stability weights that do not add up to 1", () => {
    const c = clone();
    c.stability.weights.recency = 0.9;
    expect(() => parseScoringConfig(c)).toThrow("stability.weights");
  });

  it("accepts weights that add up to 1 within float error", () => {
    const c = clone();
    c.stability.weights = { recency: 0.1 + 0.2, maturity: 0.3, issueHealth: 0.4 };
    expect(() => parseScoringConfig(c)).not.toThrow();
  });

  it.each([0, -1])(
    "rejects a log cap of %s, which would divide by zero or flip the sign",
    (cap) => {
      const c = clone();
      c.popularity.logCaps.stars = cap;
      expect(() => parseScoringConfig(c)).toThrow("popularity.logCaps.stars");
    },
  );

  it.each([0, -365])("rejects a decay of %s days", (value) => {
    const c = clone();
    c.stability.recencyDecayDays = value;
    expect(() => parseScoringConfig(c)).toThrow("recencyDecayDays");
  });

  it("rejects a neutral issue health outside 0 to 1", () => {
    const c = clone();
    c.stability.neutralIssueHealth = 1.5;
    expect(() => parseScoringConfig(c)).toThrow("neutralIssueHealth");
  });

  describe("tiers", () => {
    it("must start at 0, or low scores would have no tier", () => {
      const c = clone();
      c.tiers[0].minScore = 5;
      expect(() => parseScoringConfig(c)).toThrow("must start at 0");
    });

    it("must strictly increase", () => {
      const c = clone();
      c.tiers[2].minScore = 40;
      expect(() => parseScoringConfig(c)).toThrow("higher score");
    });

    it("must be listed smallest first, because the ledger stores these ids", () => {
      const c = clone();
      [c.tiers[0], c.tiers[1]] = [c.tiers[1], c.tiers[0]];
      expect(() => parseScoringConfig(c)).toThrow("in this order");
    });

    it("cannot gain or lose a tier, which would change what the ledger can hold", () => {
      const missing = clone();
      missing.tiers.pop();
      expect(() => parseScoringConfig(missing)).toThrow("tiers");
      const extra = clone();
      extra.tiers.push({ id: "3x3x3", name: "Colossus", minScore: 90 });
      expect(() => parseScoringConfig(extra)).toThrow("tiers");
    });

    it("rejects a threshold above 100", () => {
      const c = clone();
      c.tiers[3].minScore = 101;
      expect(() => parseScoringConfig(c)).toThrow("minScore");
    });
  });

  it("lists every problem at once", () => {
    const c = clone();
    c.popularity.weights.stars = 0.9;
    c.tiers[0].minScore = 5;
    c.states.weatheredAfterDays = 0;
    let message = "";
    try {
      parseScoringConfig(c);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("popularity.weights");
    expect(message).toContain("tiers.0.minScore");
    expect(message).toContain("states.weatheredAfterDays");
  });
});
