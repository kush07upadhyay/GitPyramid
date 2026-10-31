import { describe, expect, it } from "vitest";
import { brickPath, parseBrickPath } from "./paths";

describe("brickPath", () => {
  it("lowercases and nests by owner", () => {
    expect(brickPath("FastAPI/FastAPI")).toBe("bricks/fastapi/fastapi.json");
  });
});

describe("parseBrickPath", () => {
  it("accepts a normal path", () => {
    expect(parseBrickPath("bricks/fastapi/fastapi.json")).toEqual({
      owner: "fastapi",
      repo: "fastapi",
      full: "fastapi/fastapi",
    });
  });

  it("accepts dots, underscores and hyphens in repository names", () => {
    expect(parseBrickPath("bricks/mrdoob/three.js.json")).toMatchObject({
      full: "mrdoob/three.js",
    });
    expect(parseBrickPath("bricks/a-b/c_d-e.json")).toMatchObject({ full: "a-b/c_d-e" });
  });

  const bad: Array<[string, string, RegExp]> = [
    ["too shallow", "bricks/fastapi.json", /registry\/bricks\/<owner>\/<repo>\.json/],
    ["too deep", "bricks/a/b/c.json", /registry\/bricks\/<owner>\/<repo>\.json/],
    ["wrong root", "other/a/b.json", /registry\/bricks\/<owner>\/<repo>\.json/],
    ["not json", "bricks/a/b.md", /Only \.json files/],
    ["uppercase owner", "bricks/Fast/api.json", /lowercase/],
    ["uppercase repo", "bricks/fast/Api.json", /lowercase/],
    ["owner starts with a hyphen", "bricks/-a/b.json", /not a valid GitHub owner/],
    ["owner ends with a hyphen", "bricks/a-/b.json", /not a valid GitHub owner/],
    ["owner has double hyphen", "bricks/a--b/c.json", /not a valid GitHub owner/],
    ["owner too long", `bricks/${"a".repeat(40)}/b.json`, /not a valid GitHub owner/],
    ["empty repo name", "bricks/a/.json", /not a valid GitHub repository/],
    ["repo ends with .git", "bricks/a/b.git.json", /not a valid GitHub repository/],
    ["repo too long", `bricks/a/${"b".repeat(101)}.json`, /not a valid GitHub repository/],
    ["repo with a space", "bricks/a/b c.json", /not a valid GitHub repository/],
  ];
  it.each(bad)("rejects %s", (_name, path, message) => {
    const result = parseBrickPath(path);
    expect(result).toHaveProperty("problem");
    expect((result as { problem: string }).problem).toMatch(message);
  });

  it("suggests the lowercase path", () => {
    const result = parseBrickPath("bricks/FastAPI/FastAPI.json") as { problem: string };
    expect(result.problem).toContain("registry/bricks/fastapi/fastapi.json");
  });

  it("accepts the longest valid owner and repo", () => {
    const owner = "a".repeat(39);
    const repo = "b".repeat(100);
    expect(parseBrickPath(`bricks/${owner}/${repo}.json`)).toMatchObject({
      full: `${owner}/${repo}`,
    });
  });
});
