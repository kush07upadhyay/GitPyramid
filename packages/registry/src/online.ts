import { z } from "zod";
import { checkLicense, compareWithGitHub } from "./license";
import type { LedgerEntry } from "./schema";
import type { Issue, ValidatedBrick } from "./types";

export interface HttpResponseLike {
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}

export type Fetcher = (
  url: string,
  init: { headers: Record<string, string>; signal?: AbortSignal },
) => Promise<HttpResponseLike>;

export interface OnlineOptions {
  fetcher?: Fetcher;
  /** A GitHub token raises the rate limit. It is only ever sent to api.github.com. */
  token?: string | undefined;
  /** Injected so tests are deterministic. */
  now?: Date;
  maxRequests?: number;
  timeoutMs?: number;
}

const RepoResponse = z.object({
  id: z.number(),
  full_name: z.string(),
  private: z.boolean().optional(),
  archived: z.boolean().optional(),
  disabled: z.boolean().optional(),
  fork: z.boolean().optional(),
  is_template: z.boolean().optional(),
  stargazers_count: z.number().optional(),
  pushed_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  license: z.object({ spdx_id: z.string().nullable().optional() }).nullable().optional(),
});

const DAY = 24 * 60 * 60 * 1000;

const defaultFetcher: Fetcher = (url, init) => fetch(url, init) as Promise<HttpResponseLike>;

/**
 * Check bricks against the GitHub API. Network trouble and rate limits are warnings, never errors,
 * so an outage cannot block a contributor. Name reuse, archival and license mismatches are errors.
 */
export async function checkOnline(
  bricks: readonly ValidatedBrick[],
  ledger: readonly LedgerEntry[],
  options: OnlineOptions = {},
): Promise<Issue[]> {
  const fetcher = options.fetcher ?? defaultFetcher;
  const now = options.now ?? new Date();
  const maxRequests = options.maxRequests ?? 100;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const issues: Issue[] = [];
  const byRepo = new Map(ledger.map((entry) => [entry.repo, entry]));

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "gitpyramid-registry-validator",
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const note = (severity: Issue["severity"], file: string, code: string, message: string) =>
    issues.push({ severity, file, code, message });

  let used = 0;
  let unverified = 0;
  for (const brick of bricks) {
    if (used >= maxRequests) {
      unverified++;
      continue;
    }
    used++;
    const url = `https://api.github.com/repos/${brick.owner}/${brick.repo}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: HttpResponseLike;
    try {
      response = await fetcher(url, { headers, signal: controller.signal });
    } catch {
      note(
        "warning",
        brick.file,
        "ONLINE_UNAVAILABLE",
        `Could not reach GitHub to check ${brick.full}. It will be checked again later.`,
      );
      continue;
    } finally {
      clearTimeout(timer);
    }

    const limited =
      response.status === 429 ||
      (response.status === 403 &&
        (response.headers.get("x-ratelimit-remaining") === "0" ||
          response.headers.get("retry-after") !== null));
    if (limited) {
      note(
        "warning",
        brick.file,
        "ONLINE_RATE_LIMITED",
        "GitHub's rate limit was reached, so the remaining repositories were not checked online. Set GITHUB_TOKEN to raise the limit.",
      );
      unverified += bricks.length - used;
      break;
    }
    if (response.status === 404) {
      note(
        "error",
        brick.file,
        "REPO_NOT_FOUND",
        `GitHub has no public repository called ${brick.full}. Check the spelling, and that it is public.`,
      );
      continue;
    }
    if (response.status === 403 || response.status === 451) {
      note(
        "error",
        brick.file,
        "REPO_UNAVAILABLE",
        `${brick.full} is blocked or unavailable on GitHub (status ${response.status}).`,
      );
      continue;
    }
    if (response.status >= 500) {
      note(
        "warning",
        brick.file,
        "ONLINE_UNAVAILABLE",
        `GitHub had a server problem (status ${response.status}) while checking ${brick.full}.`,
      );
      continue;
    }
    if (response.status !== 200) {
      note(
        "warning",
        brick.file,
        "ONLINE_UNEXPECTED",
        `GitHub answered with status ${response.status} for ${brick.full}.`,
      );
      continue;
    }

    let parsed: z.infer<typeof RepoResponse>;
    try {
      parsed = RepoResponse.parse(await response.json());
    } catch {
      note(
        "warning",
        brick.file,
        "ONLINE_UNEXPECTED",
        `GitHub's answer for ${brick.full} was not in the expected shape.`,
      );
      continue;
    }

    const canonical = parsed.full_name.toLowerCase();
    if (canonical !== brick.full) {
      note(
        "error",
        brick.file,
        "RENAMED",
        `GitHub says ${brick.full} is now ${parsed.full_name}. Rename the file to registry/bricks/${canonical}.json and set repo to "${canonical}".`,
      );
    }
    const entry = byRepo.get(brick.full) ?? byRepo.get(canonical);
    if (entry?.githubId !== undefined && entry.githubId !== parsed.id) {
      note(
        "error",
        brick.file,
        "REPO_ID_CHANGED",
        `The repository now at ${brick.full} is not the one admitted as #${entry.id} (GitHub id ${parsed.id}, expected ${entry.githubId}). The old name may have been taken over. A maintainer must review this.`,
      );
    }
    if (parsed.private) note("error", brick.file, "PRIVATE", `${brick.full} is private.`);
    if (parsed.archived) {
      note(
        "error",
        brick.file,
        "ARCHIVED",
        `${brick.full} is archived, and archived projects cannot become bricks.`,
      );
    }
    if (parsed.disabled)
      note("error", brick.file, "DISABLED", `${brick.full} is disabled on GitHub.`);
    if (parsed.fork)
      note(
        "warning",
        brick.file,
        "FORK",
        `${brick.full} is a fork. Say in the pull request why it deserves its own brick.`,
      );
    if (parsed.is_template)
      note("warning", brick.file, "TEMPLATE", `${brick.full} is a template repository.`);

    const ids = checkLicense(brick.brick.license).ids;
    const comparison = compareWithGitHub(ids, parsed.license?.spdx_id ?? null);
    if (comparison.kind === "mismatch") {
      note(
        "error",
        brick.file,
        "LICENSE_MISMATCH",
        `license says "${brick.brick.license}" but GitHub detects "${comparison.detected}". Use the identifier GitHub shows, or explain the difference in the pull request.`,
      );
    } else if (comparison.kind === "unverifiable") {
      note("warning", brick.file, "LICENSE_UNVERIFIED", comparison.reason);
    }

    if (parsed.pushed_at) {
      const idle = Math.floor((now.getTime() - Date.parse(parsed.pushed_at)) / DAY);
      if (idle > 365) {
        note(
          "warning",
          brick.file,
          "WEATHERED",
          `No push to ${brick.full} for ${idle} days. It would appear weathered on the monument.`,
        );
      }
    }
    if (parsed.created_at) {
      const age = Math.floor((now.getTime() - Date.parse(parsed.created_at)) / DAY);
      if (age < 30)
        note(
          "warning",
          brick.file,
          "NEW_REPO",
          `${brick.full} is only ${Math.max(age, 0)} days old. Reviewers will look closer.`,
        );
    }
    if ((parsed.stargazers_count ?? 0) < 100) {
      note(
        "warning",
        brick.file,
        "LOW_SIGNAL",
        `${brick.full} has under 100 stars. Reviewers will look closer.`,
      );
    }
  }
  if (unverified > 0 && !issues.some((i) => i.code === "ONLINE_RATE_LIMITED")) {
    note(
      "warning",
      "registry",
      "ONLINE_LIMIT",
      `${unverified} repositories were not checked online because the limit of ${maxRequests} requests was reached.`,
    );
  }
  return issues;
}
