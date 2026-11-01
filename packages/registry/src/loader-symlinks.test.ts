import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadRegistry } from "./loader";
import { brick, ledgerLine, TAXONOMY_TEXT } from "./test-helpers";

/**
 * A pull request can contain a symbolic link where a folder or file should be. If the validator
 * followed it in CI, it could read files outside the registry. Creating links needs a privilege on
 * Windows, so a test skips itself there when the operating system refuses.
 */
function link(target: string, path: string, kind: "file" | "dir"): boolean {
  try {
    symlinkSync(target, path, kind === "dir" && process.platform === "win32" ? "junction" : kind);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EPERM" || code === "EACCES" || code === "UNKNOWN") return false;
    throw error;
  }
}

const SECRET = "TOP-SECRET-MARKER-12345";

let dir: string;
let outside: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "gp-registry-"));
  outside = mkdtempSync(join(tmpdir(), "gp-outside-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

describe("symbolic links in the registry", () => {
  it("flags a link in place of a manifest and never reads its target", (ctx) => {
    writeFileSync(join(outside, "secret.txt"), SECRET);
    mkdirSync(join(dir, "bricks", "a"), { recursive: true });
    if (!link(join(outside, "secret.txt"), join(dir, "bricks", "a", "b.json"), "file")) ctx.skip();
    const { snapshot, issues } = loadRegistry(dir);
    expect(issues.map((i) => `${i.code} ${i.file}`)).toEqual(["SYMLINK registry/bricks/a/b.json"]);
    expect(JSON.stringify(snapshot)).not.toContain(SECRET);
  });

  it("flags a link in place of the bricks folder and loads nothing from it", (ctx) => {
    mkdirSync(join(outside, "a"), { recursive: true });
    writeFileSync(join(outside, "a", "b.json"), JSON.stringify(brick()));
    if (!link(outside, join(dir, "bricks"), "dir")) ctx.skip();
    const { snapshot, issues } = loadRegistry(dir);
    expect(issues.map((i) => `${i.code} ${i.file}`)).toEqual(["SYMLINK registry/bricks"]);
    expect(snapshot.brickFiles).toEqual([]);
  });

  it("flags a link in place of a folder inside bricks", (ctx) => {
    mkdirSync(join(outside, "x"), { recursive: true });
    writeFileSync(join(outside, "x", "y.json"), SECRET);
    mkdirSync(join(dir, "bricks"), { recursive: true });
    if (!link(join(outside, "x"), join(dir, "bricks", "owner"), "dir")) ctx.skip();
    const { snapshot, issues } = loadRegistry(dir);
    expect(issues.map((i) => i.code)).toEqual(["SYMLINK"]);
    expect(JSON.stringify(snapshot)).not.toContain(SECRET);
  });

  it("flags a link in place of the ledger and does not read it", (ctx) => {
    writeFileSync(join(outside, "ledger.jsonl"), `${ledgerLine({ repo: SECRET })}\n`);
    if (!link(join(outside, "ledger.jsonl"), join(dir, "ledger.jsonl"), "file")) ctx.skip();
    const { snapshot, issues } = loadRegistry(dir);
    expect(issues.map((i) => `${i.code} ${i.file}`)).toEqual(["SYMLINK registry/ledger.jsonl"]);
    expect(snapshot.ledgerText).toBeUndefined();
  });

  it("flags a link in place of the taxonomy and does not read it", (ctx) => {
    writeFileSync(join(outside, "taxonomy.json"), TAXONOMY_TEXT.replace("backend", SECRET));
    if (!link(join(outside, "taxonomy.json"), join(dir, "taxonomy.json"), "file")) ctx.skip();
    const { snapshot, issues } = loadRegistry(dir);
    expect(issues.map((i) => `${i.code} ${i.file}`)).toEqual(["SYMLINK registry/taxonomy.json"]);
    expect(snapshot.taxonomyText).toBeUndefined();
  });

  it("does not flag ordinary files and folders", () => {
    mkdirSync(join(dir, "bricks", "a"), { recursive: true });
    writeFileSync(join(dir, "bricks", "a", "b.json"), JSON.stringify(brick()));
    writeFileSync(join(dir, "taxonomy.json"), TAXONOMY_TEXT);
    expect(loadRegistry(dir).issues).toEqual([]);
  });
});
