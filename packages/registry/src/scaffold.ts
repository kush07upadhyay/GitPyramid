import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { checkLicense, normalizeLicenseId } from "./license";
import type { Fetcher } from "./online";
import { brickPath } from "./paths";
import { BRICK_SCHEMA_REF, REPO_PATTERN, SECTORS, TAG_PATTERN } from "./schema";
import { checkWebsite } from "./website";

export interface ScaffoldOptions {
  rootDir: string;
  repo: string;
  sector: string | undefined;
  category: string | undefined;
  offline: boolean;
  fetcher?: Fetcher;
  token?: string | undefined;
}

export type ScaffoldResult =
  | { ok: true; path: string; notes: string[] }
  | { ok: false; message: string };

interface GitHubRepo {
  name?: string;
  full_name?: string;
  homepage?: string | null;
  language?: string | null;
  topics?: string[];
  license?: { spdx_id?: string | null } | null;
}

export async function scaffoldBrick(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const repo = options.repo
    .trim()
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/\/$/, "")
    .toLowerCase();
  if (!REPO_PATTERN.test(repo) || repo.endsWith(".git")) {
    return {
      ok: false,
      message: `"${options.repo}" is not a GitHub repository. Use owner/repo, for example fastapi/fastapi.`,
    };
  }
  if (!options.sector || !(SECTORS as readonly string[]).includes(options.sector)) {
    return { ok: false, message: `Choose a sector with --sector. Options: ${SECTORS.join(", ")}.` };
  }
  const relative = brickPath(repo);
  const target = join(options.rootDir, relative);
  if (existsSync(target)) {
    return { ok: false, message: `${relative} already exists. This project already has a brick.` };
  }

  const notes: string[] = [];
  let name = repo.split("/")[1] as string;
  let license = "MIT";
  let website: string | undefined;
  let tags: string[] = ["replace-me"];

  if (!options.offline) {
    const fetcher: Fetcher = options.fetcher ?? ((url, init) => fetch(url, init));
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "gitpyramid-registry-validator",
    };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    try {
      const response = await fetcher(`https://api.github.com/repos/${repo}`, { headers });
      if (response.status === 404) {
        return { ok: false, message: `GitHub has no public repository called ${repo}.` };
      }
      if (response.status === 200) {
        const data = (await response.json()) as GitHubRepo;
        if (data.full_name && data.full_name.toLowerCase() !== repo) {
          return {
            ok: false,
            message: `GitHub says ${repo} is now ${data.full_name}. Run this command again with ${data.full_name.toLowerCase()}.`,
          };
        }
        if (data.name) name = data.name.slice(0, 60);
        const spdx = data.license?.spdx_id;
        if (spdx && spdx !== "NOASSERTION") {
          license = normalizeLicenseId(spdx);
          if (checkLicense(license).problems.length > 0) {
            license = "TODO";
            notes.push(
              "GitHub reported a license that is not a valid SPDX identifier. Fill it in by hand.",
            );
          }
        } else {
          license = "TODO";
          notes.push(
            "GitHub could not detect the license. Open the LICENSE file and fill it in by hand.",
          );
        }
        if (data.homepage && checkWebsite(data.homepage).problems.length === 0)
          website = data.homepage;
        const candidates = [...(data.topics ?? []), data.language?.toLowerCase() ?? ""]
          .map((t) => t.toLowerCase().replace(/\s+/g, "-"))
          .filter((t) => TAG_PATTERN.test(t));
        const unique = [...new Set(candidates)].slice(0, 4);
        if (unique.length > 0) tags = unique;
      } else {
        notes.push(`GitHub answered with status ${response.status}, so nothing was prefilled.`);
      }
    } catch {
      notes.push("Could not reach GitHub, so nothing was prefilled.");
    }
  }

  const manifest: Record<string, unknown> = {
    $schema: BRICK_SCHEMA_REF,
    schemaVersion: 1,
    repo,
    name,
    sector: options.sector,
    category: options.category ?? "choose-a-category",
    problemSolved: "TODO: one plain sentence about the problem this project solves.",
    techStack: tags,
    license,
  };
  if (website) manifest.website = website;

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  return { ok: true, path: relative, notes };
}
