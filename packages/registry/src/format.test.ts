import { describe, expect, it } from "vitest";
import {
  countIssues,
  escapeCell,
  escapeData,
  escapeProperty,
  formatGitHub,
  formatSummaryMarkdown,
  formatText,
} from "./format";
import type { Issue, ValidationResult } from "./types";

const issue = (over: Partial<Issue> = {}): Issue => ({
  severity: "error",
  file: "registry/bricks/a/b.json",
  code: "SCHEMA",
  message: "name is missing.",
  ...over,
});
const result = (issues: Issue[], bricks = 1): ValidationResult => ({
  issues,
  bricks: Array.from({ length: bricks }, () => ({}) as never),
  ledger: [],
});

describe("GitHub annotations", () => {
  it("formats an error with line and column", () => {
    expect(formatGitHub([issue({ line: 4, column: 3 })])).toBe(
      "::error file=registry/bricks/a/b.json,line=4,col=3,title=SCHEMA::name is missing.",
    );
  });

  it("formats a warning without a position", () => {
    expect(formatGitHub([issue({ severity: "warning" })])).toBe(
      "::warning file=registry/bricks/a/b.json,title=SCHEMA::name is missing.",
    );
  });

  it("cannot be used to inject a new workflow command through a message", () => {
    const hostile = issue({
      message: "bad\n::add-mask::secret\n::set-output name=x::y\r\n::error::fake",
    });
    const out = formatGitHub([hostile]);
    expect(out.split("\n")).toHaveLength(1);
    expect(out).not.toMatch(/\n::/);
    expect(out).toContain("%0A::add-mask::secret%0A");
  });

  it("cannot break out of a property through a file name", () => {
    const hostile = issue({ file: "a,b:c\n::error::x%" });
    const out = formatGitHub([hostile]);
    expect(out.split("\n")).toHaveLength(1);
    expect(out).toContain("file=a%2Cb%3Ac%0A%3A%3Aerror%3A%3Ax%25,");
  });

  it("escapes percent signs first so escapes are not double decoded", () => {
    expect(escapeData("100%\n")).toBe("100%25%0A");
    expect(escapeProperty("a:b,c")).toBe("a%3Ab%2Cc");
  });
});

describe("text output", () => {
  it("groups by file and ends with a summary", () => {
    const text = formatText(
      result(
        [
          issue({ line: 2, column: 1 }),
          issue({
            file: "registry/bricks/c/d.json",
            severity: "warning",
            code: "X",
            message: "hm",
          }),
        ],
        2,
      ),
    );
    expect(text).toContain("registry/bricks/a/b.json");
    expect(text).toContain("registry/bricks/c/d.json");
    expect(text.trim().endsWith("2 bricks checked: 1 error, 1 warning.")).toBe(true);
  });

  it("uses singular and plural correctly and handles a clean run", () => {
    expect(formatText(result([], 1))).toBe("1 brick checked: 0 errors, 0 warnings.");
  });
});

describe("step summary", () => {
  it("renders a table and escapes anything that could become markup", () => {
    const md = formatSummaryMarkdown(
      result([
        issue({ message: "x | y <script>alert(1)</script> `code` [link](http://evil) *b*\nnext" }),
      ]),
    );
    expect(md).not.toContain("<script>");
    expect(md).not.toContain("](http");
    expect(md.split("\n").filter((l) => l.startsWith("| error"))).toHaveLength(1);
    expect(md).toContain("\\|");
  });

  it("says so when everything is fine", () => {
    expect(formatSummaryMarkdown(result([]))).toContain("Everything looks good.");
  });
});

describe("helpers", () => {
  it("counts by severity", () => {
    expect(
      countIssues([issue(), issue({ severity: "warning" }), issue({ severity: "warning" })]),
    ).toEqual({
      errors: 1,
      warnings: 2,
    });
  });

  it("escapes table cells and flattens line breaks", () => {
    expect(escapeCell("a|b\nc")).toBe("a\\|b c");
  });
});
