import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadRegistry } from "./loader";
import { validateRegistry } from "./validate";

const REGISTRY_DIR = fileURLToPath(new URL("../../../registry", import.meta.url));
const loaded = loadRegistry(REGISTRY_DIR);
const result = validateRegistry(loaded.snapshot);

describe("the real registry in this repository", () => {
  it("loads without trouble", () => {
    expect(loaded.issues).toEqual([]);
  });

  it("has no validation errors", () => {
    const errors = result.issues.filter((i) => i.severity === "error");
    expect(errors.map((e) => `${e.file}: ${e.code} ${e.message}`)).toEqual([]);
  });

  it("has the seed set the PRD asks for, with the foundation brick first", () => {
    expect(result.bricks.length).toBeGreaterThanOrEqual(10);
    expect(result.ledger[0]).toMatchObject({ id: 1, repo: "kush07upadhyay/gitpyramid" });
  });

  it("pins every admitted brick to its immutable GitHub id", () => {
    const missing = result.ledger.filter((e) => e.githubId === undefined).map((e) => e.repo);
    expect(missing).toEqual([]);
  });

  it("keeps maintainers in control of impact: no seed rates itself above emerging", () => {
    const self = result.ledger.find((e) => e.repo === "kush07upadhyay/gitpyramid");
    expect(self?.impact).toBe(1);
  });

  it("uses every sector at least once so the monument is not lopsided", () => {
    const sectors = new Set(result.bricks.map((b) => b.brick.sector));
    expect([...sectors].sort()).toEqual(["ai", "backend", "devops", "frontend", "systems"]);
  });

  it("only links bricks to other bricks that exist", () => {
    const known = new Set(result.bricks.map((b) => b.full));
    for (const b of result.bricks) {
      for (const ref of [...(b.brick.compatibleWith ?? []), ...(b.brick.alternatives ?? [])]) {
        expect(known.has(ref)).toBe(true);
      }
    }
  });
});
