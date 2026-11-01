import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkLinks,
  collectAnchors,
  collectLinks,
  headingText,
  isExcluded,
  listMarkdown,
  slugify,
  toIssues,
} from "./check-links";

describe("slugify and headingText", () => {
  it.each([
    ["The review rule (4-for-1)", "the-review-rule-4-for-1"],
    ["Add a brick in 10 minutes", "add-a-brick-in-10-minutes"],
    ["13. Open questions", "13-open-questions"],
    ["R0 Foundation, weeks 0 to 2", "r0-foundation-weeks-0-to-2"],
    ["Hosting, CI and security", "hosting-ci-and-security"],
    ["snake_case stays", "snake_case-stays"],
    ["Caf\u00e9 & cr\u00e8me", "caf\u00e9--cr\u00e8me"],
    ["  padded  ", "padded"],
  ])("slugify(%j) = %s", (heading, expected) => {
    expect(slugify(heading)).toBe(expected);
  });

  it.each([
    ["`pnpm validate` and more", "pnpm validate and more"],
    ["[Docs](docs/x.md) here", "Docs here"],
    ["**Bold** and *italic*", "Bold and italic"],
    ["Title ##", "Title"],
    ["<b>Tagged</b> text", "Tagged text"],
  ])("headingText(%j)", (raw, expected) => {
    expect(headingText(raw)).toBe(expected);
  });
});

describe("collectAnchors", () => {
  it("numbers repeated headings like GitHub", () => {
    const anchors = collectAnchors("# Notes\n## Notes\n### Notes\n");
    expect([...anchors]).toEqual(["notes", "notes-1", "notes-2"]);
  });

  it("ignores headings inside code fences, including tilde fences", () => {
    const anchors = collectAnchors(
      "# Real\n```\n# Not a heading\n```\n~~~\n## Nor this\n~~~\n## Also real\n",
    );
    expect([...anchors]).toEqual(["real", "also-real"]);
  });

  it("reads headings with up to three leading spaces and ignores seven hashes", () => {
    expect([...collectAnchors("   ## Indented\n####### Too many\n")]).toEqual(["indented"]);
  });

  it("handles Windows line endings", () => {
    expect([...collectAnchors("# One\r\n## Two\r\n")]).toEqual(["one", "two"]);
  });
});

describe("collectLinks", () => {
  it("finds inline links, images, reference definitions and html attributes with line numbers", () => {
    const md = [
      "See [a](one.md) and ![img](pic.png).",
      "",
      '<a href="two.md">x</a> <img src="three.svg">',
      "[ref]: four.md",
    ].join("\n");
    expect(collectLinks(md)).toEqual([
      { target: "one.md", line: 1 },
      { target: "pic.png", line: 1 },
      { target: "two.md", line: 3 },
      { target: "three.svg", line: 3 },
      { target: "four.md", line: 4 },
    ]);
  });

  it("ignores links inside code fences and inline code", () => {
    const md = "```\n[no](fence.md)\n```\n`[no](inline.md)` [yes](real.md)\n";
    expect(collectLinks(md).map((l) => l.target)).toEqual(["real.md"]);
  });

  it("copes with titles, angle brackets and parentheses in the target", () => {
    const md = '[a](x.md "Title") [b](<y z.md>) [c](w_(1).md)';
    expect(collectLinks(md).map((l) => l.target)).toEqual(["x.md", "y z.md", "w_(1).md"]);
  });

  it("finds several links on one line", () => {
    expect(collectLinks("[a](1.md) [b](2.md) [c](3.md)").map((l) => l.target)).toEqual([
      "1.md",
      "2.md",
      "3.md",
    ]);
  });
});

describe("checkLinks", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gp-links-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function put(files: Record<string, string>) {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    }
  }
  const check = (path: string, text: string) => checkLinks(dir, [{ path, text }]);
  const reasons = (path: string, text: string) => check(path, text).map((p) => p.reason);

  it("accepts a link to an existing file, directory and heading", () => {
    put({ "docs/a.md": "# Alpha\n## Beta gamma\n", "docs/sub/.keep": "" });
    const text = "[a](docs/a.md) [b](docs/a.md#beta-gamma) [d](docs/sub) [e](docs/sub/)";
    expect(reasons("README.md", text)).toEqual([]);
  });

  it("accepts a link to a heading in the same file", () => {
    expect(reasons("README.md", "# Top\n\n[up](#top)\n")).toEqual([]);
  });

  it("reports a missing file and a missing anchor", () => {
    put({ "docs/a.md": "# Alpha\n" });
    expect(reasons("README.md", "[x](docs/nope.md) [y](docs/a.md#nope) [z](#nope)")).toEqual([
      "missing-file",
      "missing-anchor",
      "missing-anchor",
    ]);
  });

  it("reports the exact line", () => {
    const [problem] = check("README.md", "ok\n\n[x](gone.md)\n");
    expect(problem).toMatchObject({ file: "README.md", line: 3, target: "gone.md" });
  });

  it("catches the wrong letter case, which works on Windows but breaks on GitHub", () => {
    put({ "docs/Guide.md": "# Guide\n" });
    const expected = ["win32", "darwin"].includes(process.platform) ? "wrong-case" : "missing-file";
    expect(reasons("README.md", "[g](docs/guide.md)")).toEqual([expected]);
    expect(reasons("README.md", "[g](docs/Guide.md)")).toEqual([]);
  });

  it("ignores external links, mail links and protocol-relative links", () => {
    const text =
      "[a](https://x.dev/nope) [b](mailto:a@b.dev) [c](//cdn.dev/x) [d](http://localhost/y)";
    expect(reasons("README.md", text)).toEqual([]);
  });

  it("decodes percent escapes and survives a malformed one", () => {
    put({ "My File.md": "# Hi\n" });
    expect(reasons("README.md", "[a](My%20File.md)")).toEqual([]);
    expect(reasons("README.md", "[a](bad%E0%A4%A.md)")).toEqual(["missing-file"]);
  });

  it("does not check anchors on non-Markdown files or GitHub line anchors", () => {
    put({ "src/code.ts": "x", "docs/a.md": "# A\n" });
    expect(
      reasons("README.md", "[a](src/code.ts#L10-L12) [b](docs/a.md#L3) [c](src/code.ts#anything)"),
    ).toEqual([]);
  });

  it("ignores a query string", () => {
    put({ "docs/a.md": "# A\n" });
    expect(reasons("README.md", "[a](docs/a.md?plain=1#a)")).toEqual([]);
  });

  it("resolves root-relative links from the repository root", () => {
    put({ "docs/a.md": "# A\n", "docs/deep/b.md": "x" });
    expect(reasons("docs/deep/b.md", "[a](/docs/a.md)")).toEqual([]);
  });

  it("refuses links that leave the repository", () => {
    expect(reasons("README.md", "[a](../outside.md)")).toEqual(["outside-repository"]);
    expect(reasons("docs/a.md", "[a](../../outside.md)")).toEqual(["outside-repository"]);
  });

  it("compares anchors without regard to case", () => {
    put({ "docs/a.md": "# Add A Brick\n" });
    expect(reasons("README.md", "[a](docs/a.md#Add-A-Brick)")).toEqual([]);
  });

  it("follows repeated headings", () => {
    put({ "docs/a.md": "# Notes\n## Notes\n" });
    expect(reasons("README.md", "[a](docs/a.md#notes-1) [b](docs/a.md#notes-2)")).toEqual([
      "missing-anchor",
    ]);
  });
});

describe("reporting and file selection", () => {
  it("turns problems into errors with a plain explanation", () => {
    const [issue] = toIssues([
      { file: "a.md", line: 4, target: "b.md#c", reason: "missing-anchor" },
    ]);
    expect(issue).toMatchObject({ severity: "error", file: "a.md", line: 4, code: "LINK" });
    expect(issue?.message).toContain("heading that does not exist");
  });

  it.each([
    [".specify/templates/spec.md", true],
    [".github/skills/speckit-plan/SKILL.md", true],
    ["docs/GitHub Pyramid Idea Analysis.md", true],
    ["node_modules/x/README.md", true],
    ["docs/PRD.md", false],
    [".github/instructions/docs.instructions.md", false],
    [".agents/skills/add-brick/SKILL.md", false],
  ])("isExcluded(%s) = %s", (path, excluded) => {
    expect(isExcluded(path)).toBe(excluded);
  });

  it("lists tracked and new Markdown files but not ignored or excluded ones", () => {
    const dir = mkdtempSync(join(tmpdir(), "gp-git-"));
    try {
      execFileSync("git", ["init", "-q"], { cwd: dir });
      const files: Record<string, string> = {
        "README.md": "# r",
        "docs/PRD.md": "# p",
        ".gitignore": "ignored/\n",
        "ignored/x.md": "# i",
        ".specify/t.md": "# s",
        "notes.txt": "x",
      };
      for (const [path, text] of Object.entries(files)) {
        mkdirSync(dirname(join(dir, path)), { recursive: true });
        writeFileSync(join(dir, path), text);
      }
      expect(listMarkdown(dir)).toEqual(["README.md", "docs/PRD.md"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
