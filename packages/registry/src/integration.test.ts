import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "./cli";
import { loadRegistry } from "./loader";
import type { Fetcher, HttpResponseLike } from "./online";
import { scaffoldBrick } from "./scaffold";
import { brick, ledgerLine, TAXONOMY_TEXT } from "./test-helpers";
import { validateRegistry } from "./validate";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "gp-registry-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(relative: string, content: string | Uint8Array) {
  const target = join(dir, relative);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, content);
}

function response(status: number, body: unknown): HttpResponseLike {
  return { status, headers: { get: () => null }, json: async () => body };
}

describe("loadRegistry", () => {
  it("reads manifests, taxonomy and ledger in a stable order", () => {
    write("taxonomy.json", TAXONOMY_TEXT);
    write("ledger.jsonl", `${ledgerLine()}\n`);
    write("bricks/zed/zed.json", JSON.stringify(brick({ repo: "zed/zed" })));
    write("bricks/fastapi/fastapi.json", JSON.stringify(brick()));
    const { snapshot, issues } = loadRegistry(dir);
    expect(issues).toEqual([]);
    expect(snapshot.brickFiles.map((f) => f.path)).toEqual([
      "bricks/fastapi/fastapi.json",
      "bricks/zed/zed.json",
    ]);
    expect(snapshot.ledgerText).toContain("fastapi/fastapi");
  });

  it("copes with a registry that has no bricks folder", () => {
    write("taxonomy.json", TAXONOMY_TEXT);
    expect(loadRegistry(dir).snapshot.brickFiles).toEqual([]);
  });

  it("flags bytes that are not UTF-8", () => {
    write("bricks/a/b.json", new Uint8Array([0x7b, 0xff, 0xfe, 0x7d]));
    const file = loadRegistry(dir).snapshot.brickFiles[0];
    expect(file?.decodeError).toBe(true);
  });

  it("reads stray non-json files so the validator can reject them", () => {
    write("bricks/a/notes.txt", "hello");
    expect(loadRegistry(dir).snapshot.brickFiles.map((f) => f.path)).toEqual([
      "bricks/a/notes.txt",
    ]);
  });
});

describe("the whole pipeline on disk", () => {
  it("validates a small registry end to end", () => {
    write("taxonomy.json", TAXONOMY_TEXT);
    write("ledger.jsonl", `${ledgerLine()}\n`);
    write("bricks/fastapi/fastapi.json", JSON.stringify(brick(), null, 2));
    const { snapshot } = loadRegistry(dir);
    expect(validateRegistry(snapshot).issues).toEqual([]);
  });
});

describe("scaffoldBrick", () => {
  const github =
    (status: number, body: unknown): Fetcher =>
    async () =>
      response(status, body);
  const base = () => ({
    rootDir: dir,
    sector: "backend",
    category: "web-frameworks",
    offline: false,
  });

  it("writes a manifest prefilled from GitHub that fails only on the human fields", async () => {
    write("taxonomy.json", TAXONOMY_TEXT);
    const result = await scaffoldBrick({
      ...base(),
      repo: "FastAPI/FastAPI",
      fetcher: github(200, {
        name: "FastAPI",
        full_name: "fastapi/fastapi",
        homepage: "https://fastapi.tiangolo.com",
        language: "Python",
        topics: ["api", "asgi", "Web Framework"],
        license: { spdx_id: "MIT" },
      }),
    });
    expect(result).toMatchObject({ ok: true, path: "bricks/fastapi/fastapi.json" });
    const written = JSON.parse(readFileSync(join(dir, "bricks/fastapi/fastapi.json"), "utf8"));
    expect(written).toMatchObject({
      repo: "fastapi/fastapi",
      license: "MIT",
      website: "https://fastapi.tiangolo.com",
    });
    expect(written.techStack).toEqual(["api", "asgi", "web-framework", "python"]);
    const { snapshot } = loadRegistry(dir);
    const errors = validateRegistry(snapshot).issues.filter((i) => i.severity === "error");
    expect(errors.map((e) => e.code)).toEqual(["TEXT_PLACEHOLDER"]);
    expect(errors[0]?.message).toContain("problemSolved");
  });

  it("normalizes a deprecated license from GitHub", async () => {
    await scaffoldBrick({
      ...base(),
      repo: "a/b",
      fetcher: github(200, { license: { spdx_id: "GPL-3.0" } }),
    });
    expect(JSON.parse(readFileSync(join(dir, "bricks/a/b.json"), "utf8")).license).toBe(
      "GPL-3.0-only",
    );
  });

  it("leaves the license for a human when GitHub cannot detect it", async () => {
    const result = await scaffoldBrick({
      ...base(),
      repo: "a/b",
      fetcher: github(200, { license: { spdx_id: "NOASSERTION" } }),
    });
    expect(result).toMatchObject({ ok: true });
    expect(JSON.parse(readFileSync(join(dir, "bricks/a/b.json"), "utf8")).license).toBe("TODO");
    expect((result as { notes: string[] }).notes.join(" ")).toContain("could not detect");
  });

  it("drops an unsafe homepage instead of copying it", async () => {
    await scaffoldBrick({
      ...base(),
      repo: "a/b",
      fetcher: github(200, { homepage: "http://bit.ly/x", license: { spdx_id: "MIT" } }),
    });
    expect(JSON.parse(readFileSync(join(dir, "bricks/a/b.json"), "utf8")).website).toBeUndefined();
  });

  it("refuses to overwrite an existing brick", async () => {
    write("bricks/a/b.json", "{}");
    const result = await scaffoldBrick({ ...base(), repo: "a/b", offline: true });
    expect(result).toMatchObject({ ok: false });
    expect(readFileSync(join(dir, "bricks/a/b.json"), "utf8")).toBe("{}");
  });

  it("tells you when the repository moved", async () => {
    const result = await scaffoldBrick({
      ...base(),
      repo: "facebook/react",
      fetcher: github(200, { full_name: "react/react" }),
    });
    expect(result).toMatchObject({ ok: false });
    expect((result as { message: string }).message).toContain("react/react");
  });

  it("reports a missing repository", async () => {
    const result = await scaffoldBrick({ ...base(), repo: "a/b", fetcher: github(404, {}) });
    expect(result).toMatchObject({ ok: false });
  });

  it("works offline with obvious placeholders", async () => {
    const result = await scaffoldBrick({ ...base(), repo: "a/b", offline: true });
    expect(result).toMatchObject({ ok: true });
    const written = JSON.parse(readFileSync(join(dir, "bricks/a/b.json"), "utf8"));
    expect(written.techStack).toEqual(["replace-me"]);
  });

  it("survives a network failure", async () => {
    const failing: Fetcher = async () => {
      throw new Error("offline");
    };
    const result = await scaffoldBrick({ ...base(), repo: "a/b", fetcher: failing });
    expect(result).toMatchObject({ ok: true });
    expect((result as { notes: string[] }).notes.join(" ")).toContain("Could not reach GitHub");
  });

  it.each(["not a repo", "a/b/c", "https://gitlab.com/a/b", "-a/b", ""])(
    "rejects %j",
    async (repo) => {
      expect(await scaffoldBrick({ ...base(), repo, offline: true })).toMatchObject({ ok: false });
    },
  );

  it("accepts a full GitHub URL", async () => {
    const result = await scaffoldBrick({
      ...base(),
      repo: "https://github.com/Fastapi/Fastapi/",
      offline: true,
    });
    expect(result).toMatchObject({ ok: true, path: "bricks/fastapi/fastapi.json" });
  });

  it("requires a valid sector", async () => {
    expect(
      await scaffoldBrick({ ...base(), repo: "a/b", sector: undefined, offline: true }),
    ).toMatchObject({ ok: false });
    expect(
      await scaffoldBrick({ ...base(), repo: "a/b", sector: "cloud", offline: true }),
    ).toMatchObject({ ok: false });
  });
});

describe("cli main", () => {
  let out: string[];
  let err: string[];
  beforeEach(() => {
    out = [];
    err = [];
    vi.spyOn(console, "log").mockImplementation((...a) => void out.push(a.join(" ")));
    vi.spyOn(console, "error").mockImplementation((...a) => void err.push(a.join(" ")));
  });

  it("returns 0 for a valid registry and 1 for one with errors", async () => {
    write("taxonomy.json", TAXONOMY_TEXT);
    write("ledger.jsonl", `${ledgerLine()}\n`);
    write("bricks/fastapi/fastapi.json", JSON.stringify(brick(), null, 2));
    expect(await main(["validate", "--root", dir])).toBe(0);
    write("bricks/fastapi/fastapi.json", JSON.stringify(brick({ pScore: 80 }), null, 2));
    expect(await main(["validate", "--root", dir])).toBe(1);
    expect(out.join("\n")).toContain("DERIVED_FIELD");
  });

  it("prints GitHub annotations with the github format", async () => {
    write("taxonomy.json", TAXONOMY_TEXT);
    write("bricks/fastapi/fastapi.json", JSON.stringify(brick({ pScore: 80 }), null, 2));
    await main(["validate", "--root", dir, "--format", "github"]);
    expect(out.join("\n")).toMatch(/::error file=.*DERIVED_FIELD/);
  });

  it("returns 2 for bad usage", async () => {
    expect(await main([])).toBe(2);
    expect(await main(["nope"])).toBe(2);
    expect(await main(["validate", "--root", join(dir, "missing")])).toBe(2);
    expect(await main(["validate", "--format", "xml", "--root", dir])).toBe(2);
    expect(await main(["validate", "--format"])).toBe(2);
    expect(await main(["new"])).toBe(2);
  });

  it("refuses an unsafe git reference instead of passing it to git", async () => {
    write("taxonomy.json", TAXONOMY_TEXT);
    const code = await main([
      "validate",
      "--root",
      dir,
      "--online",
      "--changed-since",
      "--output=evil",
    ]);
    expect(code).toBe(2);
    const code2 = await main(["validate", "--root", dir, "--online", "--changed-since", "-x"]);
    expect(code2).toBe(2);
    expect(err.join("\n")).toMatch(/--changed-since needs a value|safe git reference/);
  });

  it("scaffolds a brick through the cli", async () => {
    expect(await main(["new", "a/b", "--sector", "backend", "--offline", "--root", dir])).toBe(0);
    expect(readFileSync(join(dir, "bricks/a/b.json"), "utf8")).toContain('"repo": "a/b"');
  });
});
