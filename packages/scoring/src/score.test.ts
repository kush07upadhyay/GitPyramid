import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  computeScore,
  deriveState,
  type ImpactLevel,
  issueHealth,
  type Metrics,
  rateRepository,
  round2,
} from "./index";
import { config, metrics } from "./test-helpers";

describe("edge cases from docs/SCORING.md", () => {
  describe("negative, NaN or infinite input throws and names the field", () => {
    const fields = ["stars", "forks", "contributors", "commitsLastYear"] as const;
    const bad = [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    for (const field of fields) {
      for (const value of bad) {
        it(`${field} = ${value}`, () => {
          expect(() => computeScore(metrics({ [field]: value }), 3, config)).toThrow(RangeError);
          expect(() => computeScore(metrics({ [field]: value }), 3, config)).toThrow(field);
        });
      }
    }

    it.each([Number.NaN, Number.POSITIVE_INFINITY])("daysSinceLastCommit = %s", (value) => {
      expect(() => computeScore(metrics({ daysSinceLastCommit: value }), 3, config)).toThrow(
        "daysSinceLastCommit",
      );
    });

    it.each([Number.NaN, Number.NEGATIVE_INFINITY])("ageDays = %s", (value) => {
      expect(() => computeScore(metrics({ ageDays: value }), 3, config)).toThrow("ageDays");
    });

    it("rejects issue counts that are negative or not numbers", () => {
      expect(() =>
        computeScore(metrics({ issues: { enabled: true, total: -1, closed: 0 } }), 3, config),
      ).toThrow("issues.total");
      expect(() =>
        computeScore(
          metrics({ issues: { enabled: true, total: 5, closed: Number.NaN } }),
          3,
          config,
        ),
      ).toThrow("issues.closed");
    });

    it("rejects a value that is not a number at all", () => {
      expect(() => computeScore(metrics({ stars: "100" as unknown as number }), 3, config)).toThrow(
        "stars",
      );
    });

    it.each([0, 6, 2.5, Number.NaN, -1])("rejects impact level %s", (level) => {
      expect(() => computeScore(metrics(), level as ImpactLevel, config)).toThrow("impact level");
    });
  });

  it("treats negative days as 0, because of clock skew", () => {
    expect(computeScore(metrics({ daysSinceLastCommit: -5 }), 3, config)).toEqual(
      computeScore(metrics({ daysSinceLastCommit: 0 }), 3, config),
    );
    expect(computeScore(metrics({ ageDays: -400 }), 3, config)).toEqual(
      computeScore(metrics({ ageDays: 0 }), 3, config),
    );
    expect(
      deriveState({ archived: false, daysSinceLastCommit: -3, ageDays: -3, score: 20 }, config)
        .state,
    ).toBe("translucent");
  });

  it("clamps issue health to 1 when more issues are closed than exist", () => {
    expect(issueHealth({ enabled: true, total: 10, closed: 25 }, config)).toBe(1);
  });

  it.each([
    ["issues are disabled", { enabled: false, total: 50, closed: 10 }],
    ["there are no issues at all", { enabled: true, total: 0, closed: 0 }],
  ])("uses the neutral issue health of 0.5 when %s", (_name, issues) => {
    expect(issueHealth(issues, config)).toBe(0.5);
  });

  it("does not punish a mirror such as the Linux kernel for having no issues", () => {
    const withNone = computeScore(
      metrics({ issues: { enabled: false, total: 0, closed: 0 } }),
      5,
      config,
    );
    const half = computeScore(
      metrics({ issues: { enabled: true, total: 100, closed: 50 } }),
      5,
      config,
    );
    expect(withNone).toEqual(half);
  });

  it("gives full points for a metric above its cap, and no more", () => {
    const big = computeScore(metrics({ stars: 1e7, forks: 1e6 }), 3, config);
    const huge = computeScore(metrics({ stars: 1e300, forks: 1e300 }), 3, config);
    expect(huge.popularity).toBe(25);
    expect(big.popularity).toBe(25);
  });

  it("keeps the score of an archived repository computable", () => {
    // Archived only changes the state. The score is still shown.
    expect(computeScore(metrics(), 3, config).total).toBeGreaterThan(0);
    expect(
      deriveState({ archived: true, daysSinceLastCommit: 1, ageDays: 5000, score: 90 }, config),
    ).toEqual({ state: "weathered", battleTested: false });
  });

  describe("unrated repositories", () => {
    it("reports a missing contributor count and does not invent a score", () => {
      const partial = { ...metrics(), contributors: undefined };
      expect(rateRepository(partial, 3, config)).toEqual({
        status: "unrated",
        missing: ["contributors"],
      });
    });

    it("treats null like missing and lists every missing metric", () => {
      const result = rateRepository(
        { ...metrics(), contributors: null, issues: undefined, stars: null },
        3,
        config,
      );
      expect(result).toEqual({ status: "unrated", missing: ["stars", "contributors", "issues"] });
    });

    it("rates a complete repository", () => {
      expect(rateRepository(metrics(), 3, config)).toEqual({
        status: "rated",
        score: computeScore(metrics(), 3, config),
      });
    });

    it("does not hide a wrong value behind unrated", () => {
      expect(() => rateRepository({ ...metrics(), stars: -5 }, 3, config)).toThrow("stars");
    });

    it("counts a zero as present", () => {
      expect(rateRepository({ ...metrics(), contributors: 0 }, 3, config).status).toBe("rated");
    });
  });
});

describe("rounding", () => {
  it.each([
    [1.005, 1],
    [2.675, 2.67],
    [0.125, 0.13],
    [59.996, 60],
    [59.994, 59.99],
    [0, 0],
    [100, 100],
  ])("round2(%s) = %s", (value, expected) => {
    expect(round2(value)).toBe(expected);
  });

  it("never returns negative zero", () => {
    expect(Object.is(round2(-0), 0)).toBe(true);
  });

  it("is stable when applied twice", () => {
    for (const value of [0.1 + 0.2, 97.114999, 59.995, 12.345678]) {
      expect(round2(round2(value))).toBe(round2(value));
    }
  });
});

describe("properties over a seeded grid", () => {
  /** Small deterministic generator so a failure can be reproduced exactly. */
  function mulberry32(seed: number) {
    let a = seed;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(20261101);
  const logUniform = (max: number) => Math.floor(10 ** (rng() * Math.log10(max + 1)));

  const samples = Array.from({ length: 2000 }, () => {
    const total = logUniform(5000);
    return {
      m: metrics({
        stars: logUniform(1_000_000),
        forks: logUniform(100_000),
        contributors: logUniform(10_000),
        commitsLastYear: logUniform(20_000),
        daysSinceLastCommit: logUniform(5000),
        ageDays: logUniform(8000),
        issues: { enabled: rng() > 0.1, total, closed: Math.floor(rng() * (total + 1)) },
      }),
      level: (1 + Math.floor(rng() * 5)) as ImpactLevel,
    };
  });

  it("keeps every pillar from 0 to 25 and the total from 5 to 100", () => {
    for (const { m, level } of samples) {
      const s = computeScore(m, level, config);
      for (const pillar of [s.popularity, s.community, s.stability, s.impact]) {
        expect(pillar).toBeGreaterThanOrEqual(0);
        expect(pillar).toBeLessThanOrEqual(25);
      }
      expect(s.total).toBeGreaterThanOrEqual(5);
      expect(s.total).toBeLessThanOrEqual(100);
    }
  });

  it("never lowers the score when stars, forks, contributors, commits, age or closed issues grow", () => {
    const grow: Array<(m: Metrics) => Metrics> = [
      (m) => ({ ...m, stars: m.stars * 2 + 1 }),
      (m) => ({ ...m, forks: m.forks * 2 + 1 }),
      (m) => ({ ...m, contributors: m.contributors * 2 + 1 }),
      (m) => ({ ...m, commitsLastYear: m.commitsLastYear * 2 + 1 }),
      (m) => ({ ...m, ageDays: m.ageDays * 2 + 30 }),
      (m) => ({ ...m, issues: { ...m.issues, closed: m.issues.total } }),
    ];
    for (const { m, level } of samples) {
      const before = computeScore(m, level, config).total;
      for (const change of grow) {
        expect(computeScore(change(m), level, config).total).toBeGreaterThanOrEqual(before);
      }
    }
  });

  it("never raises the score when the last commit gets older", () => {
    for (const { m, level } of samples) {
      const before = computeScore(m, level, config).total;
      const older = computeScore(
        { ...m, daysSinceLastCommit: m.daysSinceLastCommit + 100 },
        level,
        config,
      );
      expect(older.total).toBeLessThanOrEqual(before);
    }
  });

  it("gives each impact level exactly 5 more points than the one below", () => {
    for (const { m } of samples.slice(0, 200)) {
      const totals = ([1, 2, 3, 4, 5] as const).map(
        (level) => computeScore(m, level, config).impact,
      );
      expect(totals).toEqual([5, 10, 15, 20, 25]);
    }
  });

  it("is deterministic", () => {
    for (const { m, level } of samples.slice(0, 200)) {
      expect(JSON.stringify(computeScore(m, level, config))).toBe(
        JSON.stringify(computeScore(structuredClone(m), level, config)),
      );
    }
  });
});

describe("purity", () => {
  it("does not read the clock or a random source", () => {
    const dir = new URL("./", import.meta.url);
    const sources = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    expect(sources.length).toBeGreaterThan(0);
    for (const file of sources) {
      const text = readFileSync(new URL(file, dir), "utf8");
      expect(text, file).not.toMatch(/\bDate\b|Math\.random|performance\.now|hrtime|process\.env/);
    }
  });
});
