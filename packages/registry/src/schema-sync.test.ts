import { readFileSync } from "node:fs";
import { TIER_IDS } from "@gitpyramid/scoring";
import { describe, expect, it } from "vitest";
import { generateBrickJsonSchema, SCHEMA_FILE } from "./build-schema";
import { LedgerEntrySchema } from "./schema";

describe("the ledger and the scoring package", () => {
  const entry = { id: 1, repo: "a/b", admitted: "2026-11-01", impact: 3 };

  it("accepts exactly the tiers the scoring package can produce", () => {
    for (const tier of TIER_IDS) {
      expect(LedgerEntrySchema.safeParse({ ...entry, tier }).success).toBe(true);
    }
    expect(LedgerEntrySchema.safeParse({ ...entry, tier: "3x3x3" }).success).toBe(false);
    expect(LedgerEntrySchema.safeParse({ ...entry, tier: "1x1x1 " }).success).toBe(false);
  });

  it("does not require a tier, because seed bricks are tiered at calibration", () => {
    expect(LedgerEntrySchema.safeParse(entry).success).toBe(true);
  });
});

describe("the published JSON Schema", () => {
  it("matches the Zod schema, so it cannot drift", () => {
    const committed = readFileSync(
      new URL(`../../../${SCHEMA_FILE}`, import.meta.url),
      "utf8",
    ).replace(/\r\n/g, "\n");
    expect(committed).toBe(generateBrickJsonSchema());
  });

  it("forbids unknown fields and requires the fields contributors must write", () => {
    const schema = JSON.parse(generateBrickJsonSchema());
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(
      expect.arrayContaining([
        "schemaVersion",
        "repo",
        "name",
        "sector",
        "category",
        "problemSolved",
        "techStack",
        "license",
      ]),
    );
    expect(Object.keys(schema.properties)).not.toContain("pScore");
  });
});
