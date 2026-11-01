import { describe, expect, it } from "vitest";
import { deriveState, tierForScore } from "./index";
import { config } from "./test-helpers";

describe("deriveState", () => {
  const base = { archived: false, daysSinceLastCommit: 10, ageDays: 1000, score: 50 };

  it("is solid for an active, mature repository", () => {
    expect(deriveState(base, config)).toEqual({ state: "solid", battleTested: false });
  });

  it.each([
    [365, "solid"],
    [366, "weathered"],
    [364.99, "solid"],
    [0, "solid"],
  ])("a last commit %s days ago is %s", (daysSinceLastCommit, state) => {
    expect(deriveState({ ...base, daysSinceLastCommit }, config).state).toBe(state);
  });

  it.each([
    [273, "translucent"],
    [273.99, "translucent"],
    [274, "solid"],
    [275, "solid"],
    [0, "translucent"],
  ])("a repository %s days old is %s", (ageDays, state) => {
    expect(deriveState({ ...base, ageDays }, config).state).toBe(state);
  });

  it("is weathered when archived, whatever else is true", () => {
    for (const ageDays of [0, 100, 5000]) {
      expect(
        deriveState({ ...base, archived: true, daysSinceLastCommit: 0, ageDays }, config).state,
      ).toBe("weathered");
    }
  });

  it("applies the first matching rule: weathered beats translucent", () => {
    expect(deriveState({ ...base, ageDays: 10, daysSinceLastCommit: 400 }, config).state).toBe(
      "weathered",
    );
  });

  it("is translucent when maintainers flag the project as incubating, even if it is old", () => {
    expect(deriveState({ ...base, incubating: true }, config).state).toBe("translucent");
    expect(deriveState({ ...base, incubating: false }, config).state).toBe("solid");
  });

  it("is solid again when a dormant repository becomes active again", () => {
    expect(deriveState({ ...base, daysSinceLastCommit: 900 }, config).state).toBe("weathered");
    expect(deriveState({ ...base, daysSinceLastCommit: 3 }, config).state).toBe("solid");
  });

  describe("battle-tested label", () => {
    it.each([
      [54.99, false],
      [55, true],
      [97.11, true],
      [0, false],
    ])("a solid brick with score %s is battle-tested: %s", (score, expected) => {
      expect(deriveState({ ...base, score }, config).battleTested).toBe(expected);
    });

    it("compares the rounded score, so a displayed 55.00 qualifies", () => {
      expect(deriveState({ ...base, score: 54.996 }, config).battleTested).toBe(true);
    });

    it("is never given to a weathered or translucent brick", () => {
      expect(deriveState({ ...base, score: 99, archived: true }, config).battleTested).toBe(false);
      expect(deriveState({ ...base, score: 99, ageDays: 10 }, config).battleTested).toBe(false);
    });

    it("covers the gap the plan left: an active repository over 9 months old with a low score is solid", () => {
      expect(deriveState({ ...base, ageDays: 547, score: 49.67 }, config)).toEqual({
        state: "solid",
        battleTested: false,
      });
    });
  });

  describe("invalid input", () => {
    it.each([Number.NaN, Number.POSITIVE_INFINITY])("rejects daysSinceLastCommit = %s", (v) => {
      expect(() => deriveState({ ...base, daysSinceLastCommit: v }, config)).toThrow(
        "daysSinceLastCommit",
      );
    });

    it.each([Number.NaN, Number.NEGATIVE_INFINITY])("rejects ageDays = %s", (v) => {
      expect(() => deriveState({ ...base, ageDays: v }, config)).toThrow("ageDays");
    });

    it.each([-1, 100.01, Number.NaN])("rejects score %s", (score) => {
      expect(() => deriveState({ ...base, score }, config)).toThrow("score");
    });
  });
});

describe("tierForScore", () => {
  it.each([
    [0, "1x1x1", 1],
    [39.99, "1x1x1", 1],
    [40, "2x1x1", 2],
    [59.99, "2x1x1", 2],
    [60, "2x2x1", 4],
    [79.99, "2x2x1", 4],
    [80, "2x2x2", 8],
    [100, "2x2x2", 8],
  ])("a score of %s is tier %s with %s cells", (score, id, cells) => {
    const tier = tierForScore(score, config);
    expect(tier.id).toBe(id);
    expect(tier.cells).toBe(cells);
    expect(tier.cells).toBe(tier.dimensions[0] * tier.dimensions[1] * tier.dimensions[2]);
  });

  it("compares the rounded score, so a displayed 60.00 always lands in Structural Pillar", () => {
    expect(tierForScore(59.996, config).name).toBe("Structural Pillar");
    expect(tierForScore(59.994, config).name).toBe("Standard Ashlar");
  });

  it("names the tiers the way the docs do", () => {
    expect([0, 40, 60, 80].map((s) => tierForScore(s, config).name)).toEqual([
      "Modular Unit",
      "Standard Ashlar",
      "Structural Pillar",
      "Foundation Core",
    ]);
  });

  it.each([-0.01, 100.01, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects a score of %s",
    (score) => {
      expect(() => tierForScore(score, config)).toThrow("score");
    },
  );

  it("follows the thresholds in the config, so a reviewed change takes effect", () => {
    const stricter = {
      ...config,
      tiers: config.tiers.map((tier) => (tier.id === "2x1x1" ? { ...tier, minScore: 50 } : tier)),
    };
    expect(tierForScore(45, stricter).id).toBe("1x1x1");
    expect(tierForScore(45, config).id).toBe("2x1x1");
  });
});
