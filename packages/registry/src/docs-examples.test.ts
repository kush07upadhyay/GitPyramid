import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { brick, codes, file, run } from "./test-helpers";

const doc = readFileSync(new URL("../../../CONTRIBUTING.md", import.meta.url), "utf8").replace(
  /\r\n/g,
  "\n",
);

const jsonBlocks = [...doc.matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => m[1] as string);
const template = jsonBlocks.find((b) => b.includes('"owner/repo"'));
const example = jsonBlocks.find((b) => b.includes('"fastapi/fastapi"'));

describe("CONTRIBUTING.md stays truthful", () => {
  it("contains a template and a finished example", () => {
    expect(template).toBeTruthy();
    expect(example).toBeTruthy();
  });

  it("shows a finished example that passes validation with no errors or warnings", () => {
    const result = run([file("bricks/fastapi/fastapi.json", example as string)]);
    expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(
      codes(result).filter((c) => c.startsWith("warning:") && c !== "warning:NOT_ADMITTED"),
    ).toEqual([]);
  });

  it("shows an example that is the real fastapi manifest", () => {
    const real = readFileSync(
      new URL("../../../registry/bricks/fastapi/fastapi.json", import.meta.url),
      "utf8",
    );
    expect(JSON.parse(example as string)).toEqual(JSON.parse(real));
  });

  it("shows a template that fails until the contributor edits it", () => {
    const result = run([file("bricks/owner/repo.json", template as string)]);
    const errors = result.issues.filter((i) => i.severity === "error").map((i) => i.code);
    expect(errors).toContain("PLACEHOLDER");
    expect(errors).toContain("TEXT_PLACEHOLDER");
  });

  it("still fails when only the repo is filled in, because the placeholders remain", () => {
    const edited = (template as string).replace("owner/repo", "fastapi/fastapi");
    const errors = run([file("bricks/fastapi/fastapi.json", edited)])
      .issues.filter((i) => i.severity === "error")
      .map((i) => i.code);
    expect(errors).toContain("TEXT_PLACEHOLDER");
  });

  it("links to an editor URL that prefills exactly the template", () => {
    const link = doc.match(/\]\((https:\/\/github\.com\/[^)\s]+\/new\/main\?[^)\s]+)\)/)?.[1];
    expect(link).toBeTruthy();
    const url = new URL(link as string);
    expect(url.pathname.endsWith("/new/main")).toBe(true);
    expect(url.searchParams.get("filename")).toBe("registry/bricks/owner/repo.json");
    expect((url.searchParams.get("value") as string).trim()).toBe((template as string).trim());
  });

  it("only lists sectors and categories that exist", () => {
    const sector = brick({ sector: "backend", category: "web-frameworks" });
    expect(
      run([file("bricks/fastapi/fastapi.json", sector)]).issues.map((i) => i.code),
    ).not.toContain("CATEGORY");
  });
});
