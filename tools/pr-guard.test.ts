import { describe, expect, it } from "vitest";
import { type Change, checkPullRequest, MAX_BRICKS, parseNameStatus } from "./pr-guard";

const added = (path: string): Change => ({ kind: "added", path });
const modified = (path: string): Change => ({ kind: "modified", path });
const deleted = (path: string): Change => ({ kind: "deleted", path });
const renamed = (from: string, path: string): Change => ({ kind: "renamed", from, path });

const BRICK = "registry/bricks/expressjs/express.json";
const codes = (changes: Change[], who = "NONE") =>
  checkPullRequest(changes, who).map((i) => `${i.severity}:${i.code}`);

describe("parseNameStatus", () => {
  it("parses added, modified and deleted files", () => {
    expect(parseNameStatus("A\0a.txt\0M\0b.txt\0D\0c.txt\0")).toEqual([
      { kind: "added", path: "a.txt" },
      { kind: "modified", path: "b.txt" },
      { kind: "deleted", path: "c.txt" },
    ]);
  });

  it("parses renames and copies, which carry two paths and a similarity score", () => {
    expect(parseNameStatus("R100\0old.json\0new.json\0C75\0a\0b\0")).toEqual([
      { kind: "renamed", from: "old.json", path: "new.json" },
      { kind: "copied", from: "a", path: "b" },
    ]);
  });

  it("keeps awkward file names intact, because names are NUL separated", () => {
    const names = [
      "with space.json",
      "new\nline.json",
      "tab\there.json",
      "unicode-\u00e9\u4e2d.json",
      'quo"te.json',
    ];
    const raw = names.map((n) => `A\0${n}\0`).join("");
    expect(parseNameStatus(raw).map((c) => c.path)).toEqual(names);
  });

  it("treats a type change as another kind of change, not as a hidden one", () => {
    expect(parseNameStatus("T\0registry/bricks/a/b.json\0")).toEqual([
      { kind: "other", path: "registry/bricks/a/b.json" },
    ]);
  });

  it("returns nothing for empty output", () => {
    expect(parseNameStatus("")).toEqual([]);
  });

  it.each([
    ["a status with no path", "A\0"],
    ["a rename with one path", "R100\0only-one\0"],
    ["an empty path", "M\0\0"],
  ])("rejects %s instead of guessing", (_name, raw) => {
    expect(() => parseNameStatus(raw)).toThrow("Unexpected git output");
  });
});

describe("checkPullRequest: who is checked", () => {
  const risky = [added(BRICK), modified("README.md"), modified("registry/ledger.jsonl")];

  it.each(["OWNER", "MEMBER", "COLLABORATOR"])("does not restrict %s", (who) => {
    expect(codes(risky, who)).toEqual([]);
  });

  it.each(["CONTRIBUTOR", "FIRST_TIME_CONTRIBUTOR", "FIRST_TIMER", "NONE", "MANNEQUIN", ""])(
    "restricts %j",
    (who) => {
      expect(codes(risky, who).length).toBeGreaterThan(0);
    },
  );
});

describe("checkPullRequest: a normal brick pull request", () => {
  it("is fine with one new brick", () => {
    expect(codes([added(BRICK)])).toEqual([]);
  });

  it("is fine when a contributor fixes one existing brick", () => {
    expect(codes([modified("registry/bricks/fastapi/fastapi.json")])).toEqual([]);
  });

  it("is fine for code, docs and tests, which welcome everyone", () => {
    expect(
      codes([
        modified("packages/registry/src/validate.ts"),
        added("packages/registry/src/x.test.ts"),
        modified("docs/PRD.md"),
      ]),
    ).toEqual([]);
  });

  it("is fine for a dependency update", () => {
    expect(
      codes([
        modified("package.json"),
        modified("pnpm-lock.yaml"),
        modified(".github/workflows/ci.yml"),
      ]),
    ).toEqual([]);
  });

  it("is fine for an empty change", () => {
    expect(codes([])).toEqual([]);
  });
});

describe("checkPullRequest: maintainer-only files", () => {
  it.each([
    ["the ledger", "registry/ledger.jsonl"],
    ["a sponsor file", "sponsors/example-co.json"],
    ["a sponsor logo", "sponsors/assets/example-co.svg"],
    ["a case variant of the ledger", "Registry/LEDGER.jsonl"],
    ["a case variant of sponsors", "SPONSORS/x.json"],
  ])("refuses %s", (_name, path) => {
    expect(codes([modified(path)])).toEqual(["error:MAINTAINER_ONLY"]);
  });

  it("names the file and says what to do", () => {
    const [issue] = checkPullRequest([modified("registry/ledger.jsonl")], "NONE");
    expect(issue?.file).toBe("registry/ledger.jsonl");
    expect(issue?.message).toContain("maintainer adds the line");
  });

  it("does not also call it a mixed change when the brick comes with a ledger edit", () => {
    expect(codes([added(BRICK), modified("registry/ledger.jsonl")])).toEqual([
      "error:MAINTAINER_ONLY",
    ]);
  });

  it("does not block a lookalike that is only a prefix of the name", () => {
    expect(codes([modified("registry/ledger.jsonl.md")])).toEqual([]);
    expect(codes([modified("sponsors-policy.md")])).toEqual([]);
  });
});

describe("checkPullRequest: keeping a brick separate from other changes", () => {
  it("refuses a brick mixed with another file and lists the other files", () => {
    const [issue] = checkPullRequest(
      [added(BRICK), modified("README.md"), modified("docs/PRD.md")],
      "NONE",
    );
    expect(issue?.code).toBe("MIXED_CHANGE");
    expect(issue?.message).toContain("README.md");
    expect(issue?.message).toContain("docs/PRD.md");
  });

  it("shortens a long list of other files", () => {
    const others = Array.from({ length: 9 }, (_, i) => modified(`docs/f${i}.md`));
    const [issue] = checkPullRequest([added(BRICK), ...others], "NONE");
    expect(issue?.message).toContain("and 4 more");
  });

  it("catches a non-brick file renamed into the bricks folder", () => {
    expect(codes([renamed("docs/x.json", BRICK)])).toEqual(["error:MIXED_CHANGE"]);
  });

  it("catches a case variant of the bricks folder", () => {
    expect(codes([added("Registry/Bricks/o/r.json"), modified("README.md")])).toEqual([
      "error:MIXED_CHANGE",
    ]);
  });
});

describe("checkPullRequest: removing and renaming bricks", () => {
  it("refuses a deletion and explains why", () => {
    const [issue] = checkPullRequest([deleted(BRICK)], "NONE");
    expect(issue?.code).toBe("BRICK_REMOVAL");
    expect(issue?.file).toBe(BRICK);
    expect(issue?.message).toContain("ids are never reused");
  });

  it("refuses a rename inside the bricks folder, which needs a ledger change", () => {
    expect(codes([renamed("registry/bricks/a/b.json", "registry/bricks/c/d.json")])).toEqual([
      "error:BRICK_REMOVAL",
    ]);
  });

  it("refuses moving a brick out of the folder", () => {
    expect(codes([renamed(BRICK, "docs/express.json")]).sort()).toEqual([
      "error:BRICK_REMOVAL",
      "error:MIXED_CHANGE",
    ]);
  });

  it("does not count a deleted brick as an added one", () => {
    expect(codes([deleted(BRICK)])).toEqual(["error:BRICK_REMOVAL"]);
  });
});

describe("checkPullRequest: how many bricks", () => {
  const bricks = (n: number) =>
    Array.from({ length: n }, (_, i) => added(`registry/bricks/owner${i}/repo${i}.json`));

  it("is quiet for one", () => {
    expect(codes(bricks(1))).toEqual([]);
  });

  it.each([2, MAX_BRICKS])("only warns for %s", (n) => {
    expect(codes(bricks(n))).toEqual(["warning:MANY_BRICKS"]);
  });

  it.each([MAX_BRICKS + 1, 40])("refuses %s", (n) => {
    expect(codes(bricks(n))).toEqual(["error:TOO_MANY_BRICKS"]);
  });

  it("counts a type change to a brick path like any other change", () => {
    const changes: Change[] = [{ kind: "other", path: BRICK }, added("registry/bricks/a/b.json")];
    expect(codes(changes)).toEqual(["warning:MANY_BRICKS"]);
  });
});
