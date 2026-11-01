import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateBrickJsonSchema, SCHEMA_FILE } from "./build-schema";

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
