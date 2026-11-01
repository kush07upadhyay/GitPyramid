import { OWNER_PATTERN, REPO_NAME_PATTERN } from "./schema";

export const BRICKS_DIR = "bricks";

/** The one place that knows where a brick lives. See ADR-0005. */
export function brickPath(repo: string): string {
  return `${BRICKS_DIR}/${repo.toLowerCase()}.json`;
}

export interface ParsedBrickPath {
  owner: string;
  repo: string;
  /** Full owner/repo as written in the path. */
  full: string;
}

/**
 * Parse a path relative to the registry folder, for example `bricks/fastapi/fastapi.json`.
 * Returns an explanation instead of a result when the shape is wrong.
 */
export function parseBrickPath(relative: string): ParsedBrickPath | { problem: string } {
  const parts = relative.split("/");
  if (parts[0] !== BRICKS_DIR || parts.length !== 3) {
    return {
      problem: `Manifests live at registry/bricks/<owner>/<repo>.json. This file is at registry/${relative}.`,
    };
  }
  const owner = parts[1] as string;
  const file = parts[2] as string;
  if (!file.endsWith(".json")) {
    return { problem: `Only .json files belong in registry/bricks. Found "${file}".` };
  }
  const repo = file.slice(0, -".json".length);
  if (owner !== owner.toLowerCase() || repo !== repo.toLowerCase()) {
    return {
      problem: `The path must be all lowercase. Use registry/bricks/${owner.toLowerCase()}/${repo.toLowerCase()}.json.`,
    };
  }
  if (!OWNER_PATTERN.test(owner)) {
    return {
      problem: `"${owner}" is not a valid GitHub owner name. Owners use letters, digits and single hyphens, up to 39 characters.`,
    };
  }
  if (!REPO_NAME_PATTERN.test(repo) || repo === "." || repo === ".." || repo.endsWith(".git")) {
    return {
      problem: `"${repo}" is not a valid GitHub repository name. Use letters, digits, dot, hyphen and underscore, and do not end with ".git".`,
    };
  }
  return { owner, repo, full: `${owner}/${repo}` };
}
