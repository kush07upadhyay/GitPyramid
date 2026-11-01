import { execFileSync } from "node:child_process";
import { countIssues, formatGitHub } from "../packages/registry/src/format";
import { assertSafeRef } from "../packages/registry/src/git";
import type { Issue } from "../packages/registry/src/types";

/**
 * Pull request rules that CONTRIBUTING and GOVERNANCE already promise, enforced with a plain
 * message instead of a confusing "review required". The rules only apply to people without write
 * access. Maintainers can change anything, and CODEOWNERS still asks them to review.
 */

export type ChangeKind = "added" | "modified" | "deleted" | "renamed" | "copied" | "other";

export interface Change {
  kind: ChangeKind;
  path: string;
  /** For renames and copies, where the file came from. */
  from?: string;
}

const KINDS: Record<string, ChangeKind> = {
  A: "added",
  M: "modified",
  D: "deleted",
  R: "renamed",
  C: "copied",
};

/** Parse `git diff --name-status -z`. Names are NUL separated, so any character is safe. */
export function parseNameStatus(raw: string): Change[] {
  const tokens = raw.split("\0");
  if (tokens[tokens.length - 1] === "") tokens.pop();
  const changes: Change[] = [];
  let i = 0;
  while (i < tokens.length) {
    const status = tokens[i++] as string;
    const kind = KINDS[status.charAt(0)] ?? "other";
    const takesTwoPaths = kind === "renamed" || kind === "copied";
    const first = tokens[i++];
    const second = takesTwoPaths ? tokens[i++] : undefined;
    if (first === undefined || first === "" || (takesTwoPaths && !second)) {
      throw new Error(`Unexpected git output near "${status}".`);
    }
    changes.push(
      takesTwoPaths ? { kind, path: second as string, from: first } : { kind, path: first },
    );
  }
  return changes;
}

const BRICKS = "registry/bricks/";
const LEDGER = "registry/ledger.jsonl";
const SPONSORS = "sponsors/";
/** The licenses and the notice of third-party licenses. Only the exact paths, never lookalikes. */
const LICENSE_FILES = new Set(["license", "third_party_notices.md", "registry/license"]);
/** More than one brick is discouraged. More than this many is refused. */
export const MAX_BRICKS = 5;
const TRUSTED = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);

// Matching ignores case. On Windows and macOS, `Registry/LEDGER.jsonl` is the same file as the real
// ledger, so a case variant must be protected too.
const inBricks = (path: string) => path.toLowerCase().startsWith(BRICKS);
const isLicenseFile = (path: string) => LICENSE_FILES.has(path.toLowerCase());
const isProtected = (path: string) => {
  const lower = path.toLowerCase();
  return lower === LEDGER || lower.startsWith(SPONSORS) || LICENSE_FILES.has(lower);
};

function touched(change: Change): string[] {
  return change.from === undefined ? [change.path] : [change.from, change.path];
}

function list(paths: string[]): string {
  const shown = paths.slice(0, 5).join(", ");
  return paths.length > 5 ? `${shown} and ${paths.length - 5} more` : shown;
}

export function checkPullRequest(changes: readonly Change[], authorAssociation: string): Issue[] {
  if (TRUSTED.has(authorAssociation)) return [];
  const issues: Issue[] = [];
  const add = (severity: Issue["severity"], file: string, code: string, message: string) =>
    issues.push({ severity, file, code, message });

  const allPaths = [...new Set(changes.flatMap(touched))];

  const protectedPaths = allPaths.filter(isProtected);
  for (const path of protectedPaths) {
    add(
      "error",
      path,
      "MAINTAINER_ONLY",
      path.toLowerCase() === LEDGER
        ? "The ledger is edited by maintainers only. A maintainer adds the line for your brick after it is merged. Please remove this file from your pull request."
        : isLicenseFile(path)
          ? "The license files are maintainer-only, because they decide how everyone may use this project. If you think a license is wrong, open an issue. Please remove this file from your pull request."
          : "Sponsor files are maintainer-only (see docs/SPONSORSHIP.md). Please remove this file from your pull request.",
    );
  }

  const brickChanges = changes.filter((c) => touched(c).some(inBricks));
  if (brickChanges.length > 0) {
    const others = allPaths.filter((p) => !inBricks(p) && !isProtected(p));
    if (others.length > 0) {
      add(
        "error",
        others[0] as string,
        "MIXED_CHANGE",
        `This pull request changes a brick and also other files: ${list(others)}. Please keep a brick pull request to registry/bricks only, and open a separate pull request for the rest.`,
      );
    }
  }

  for (const change of brickChanges) {
    const removed =
      change.kind === "deleted" ||
      (change.kind === "renamed" && change.from !== undefined && inBricks(change.from));
    if (removed) {
      add(
        "error",
        change.from ?? change.path,
        "BRICK_REMOVAL",
        "Removing or renaming a brick is done by maintainers, because the ledger changes with it and ids are never reused. Please open a bug report that names the brick and says why.",
      );
    }
  }

  const bricksAdded = changes.filter((c) => c.kind !== "deleted" && inBricks(c.path)).length;
  if (bricksAdded > MAX_BRICKS) {
    add(
      "error",
      "registry/bricks",
      "TOO_MANY_BRICKS",
      `This pull request changes ${bricksAdded} bricks. Please send at most ${MAX_BRICKS} at a time. One is best, so each gets a proper review.`,
    );
  } else if (bricksAdded > 1) {
    add(
      "warning",
      "registry/bricks",
      "MANY_BRICKS",
      `This pull request changes ${bricksAdded} bricks. One brick per pull request keeps reviews quick and the review rule fair.`,
    );
  }

  return issues;
}

function run(): number {
  const base = process.env.BASE_REF;
  if (!base) {
    console.error(
      "BASE_REF is not set. It is the branch the pull request targets, for example origin/main.",
    );
    return 2;
  }
  assertSafeRef(base);
  const raw = execFileSync("git", ["diff", "--name-status", "-z", "-M", `${base}...HEAD`], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const association = process.env.AUTHOR_ASSOCIATION ?? "NONE";
  const issues = checkPullRequest(parseNameStatus(raw), association);
  if (issues.length === 0) {
    console.log("Pull request rules: nothing to report.");
    return 0;
  }
  console.log(formatGitHub(issues));
  for (const issue of issues) console.log(`${issue.severity}: ${issue.code}: ${issue.message}`);
  return countIssues(issues).errors > 0 ? 1 : 0;
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("pr-guard.ts") || entry.endsWith("pr-guard.js")) {
  try {
    process.exit(run());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}
