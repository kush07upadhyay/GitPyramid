import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { loadRegistry } from "./loader";
import type { Fetcher } from "./online";
import { brickPath } from "./paths";
import { REPO_PATTERN } from "./schema";
import { validateRegistry } from "./validate";

/**
 * Appends the ledger line that admits a merged brick. A maintainer does this after a brick pull
 * request is merged. Doing it by hand means counting the next id and looking up GitHub's numeric
 * repository id, and one slip breaks the "ids never repeat" promise. This command computes both,
 * checks the result against the whole registry in memory, and writes nothing if anything is wrong.
 */

export interface AdmitOptions {
  /** The registry folder, for example `registry`. */
  rootDir: string;
  repo: string;
  /** 1 to 5, from the impact rubric. There is no default, because it is a judgment. */
  impact: number | undefined;
  /** GitHub login of the admitting maintainer. */
  by?: string | undefined;
  /** YYYY-MM-DD. Defaults to today in the maintainer's own time zone. */
  date?: string | undefined;
  /** GitHub's numeric repository id. Needed with `offline`. Checked against GitHub otherwise. */
  githubId?: number | undefined;
  offline: boolean;
  incubating?: boolean | undefined;
  dryRun?: boolean | undefined;
  fetcher?: Fetcher;
  token?: string | undefined;
  /** Injected so tests are deterministic. */
  now?: Date;
}

export type AdmitResult =
  | { ok: true; id: number; line: string; wrote: boolean; notes: string[] }
  /** `usage`: the command was used wrongly. `refused`: the registry is in a state that blocks it. */
  | { ok: false; kind: "usage" | "refused"; message: string };

const usage = (message: string): AdmitResult => ({ ok: false, kind: "usage", message });
const refused = (message: string): AdmitResult => ({ ok: false, kind: "refused", message });

const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

const RepoInfo = z.object({
  id: z.number().int().positive(),
  full_name: z.string(),
  private: z.boolean().optional(),
  archived: z.boolean().optional(),
  disabled: z.boolean().optional(),
});

function localDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function bulletList(messages: string[], limit = 3): string {
  const shown = messages.slice(0, limit).map((m) => `  - ${m}`);
  if (messages.length > limit) shown.push(`  - and ${messages.length - limit} more`);
  return shown.join("\n");
}

async function lookUp(
  repo: string,
  options: AdmitOptions,
): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  const fetcher: Fetcher = options.fetcher ?? ((url, init) => fetch(url, init));
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "gitpyramid-registry-validator",
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  const offlineHint =
    "Try again, or pass --github-id with the id from the repository's API page and --offline.";
  try {
    const response = await fetcher(`https://api.github.com/repos/${repo}`, {
      headers,
      signal: controller.signal,
    });
    if (response.status === 404) {
      return { ok: false, message: `GitHub has no public repository called ${repo}.` };
    }
    const limited =
      response.status === 429 ||
      (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0");
    if (limited) {
      return {
        ok: false,
        message: `GitHub's rate limit was reached. Set GITHUB_TOKEN, wait, or ${offlineHint.toLowerCase()}`,
      };
    }
    if (response.status !== 200) {
      return {
        ok: false,
        message: `GitHub answered with status ${response.status} for ${repo}. ${offlineHint}`,
      };
    }
    const parsed = RepoInfo.safeParse(await response.json());
    if (!parsed.success) {
      return {
        ok: false,
        message: `GitHub's answer for ${repo} was not in the expected shape. ${offlineHint}`,
      };
    }
    const info = parsed.data;
    if (info.full_name.toLowerCase() !== repo) {
      return {
        ok: false,
        message: `GitHub says ${repo} is now ${info.full_name}. Rename the manifest and its repo field first (see registry/README.md), then admit it.`,
      };
    }
    if (info.private)
      return { ok: false, message: `${repo} is private, so it cannot become a brick.` };
    if (info.archived)
      return {
        ok: false,
        message: `${repo} is archived, and archived projects cannot become bricks.`,
      };
    if (info.disabled) return { ok: false, message: `${repo} is disabled on GitHub.` };
    return { ok: true, id: info.id };
  } catch {
    return { ok: false, message: `Could not reach GitHub to look up ${repo}. ${offlineHint}` };
  } finally {
    clearTimeout(timer);
  }
}

export async function admitBrick(options: AdmitOptions): Promise<AdmitResult> {
  const repo = options.repo
    .trim()
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/\/$/, "")
    .toLowerCase();
  if (!REPO_PATTERN.test(repo) || repo.endsWith(".git")) {
    return usage(
      `"${options.repo}" is not a GitHub repository. Use owner/repo, for example fastapi/fastapi.`,
    );
  }

  const impact = options.impact;
  if (impact === undefined || !Number.isInteger(impact) || impact < 1 || impact > 5) {
    return usage(
      "Give an impact level from 1 to 5 with --impact. It is a judgment that maintainers make, using the rubric in docs/SCORING.md#impact-rubric.",
    );
  }
  if (options.by !== undefined && !LOGIN.test(options.by)) {
    return usage(`"${options.by}" is not a GitHub login. Use letters, digits and single hyphens.`);
  }
  if (options.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    return usage(`"${options.date}" is not a date. Use YYYY-MM-DD.`);
  }
  if (
    options.githubId !== undefined &&
    (!Number.isInteger(options.githubId) || options.githubId < 1)
  ) {
    return usage("--github-id must be a positive whole number.");
  }
  if (options.offline && options.githubId === undefined) {
    return usage(
      "Offline mode needs --github-id, because the numeric id is what protects a brick from a name takeover. Use the id from https://api.github.com/repos/owner/repo.",
    );
  }

  const now = options.now ?? new Date();
  const loaded = loadRegistry(options.rootDir);
  const loadErrors = loaded.issues
    .filter((i) => i.severity === "error")
    .map((i) => `${i.file}: ${i.message}`);
  if (loadErrors.length > 0) {
    return refused(`The registry could not be read cleanly:\n${bulletList(loadErrors)}`);
  }
  const validationOptions = { today: now.toISOString().slice(0, 10) };
  const before = validateRegistry(loaded.snapshot, validationOptions);

  const ledgerProblems = (issues: typeof before.issues) =>
    issues
      .filter((i) => i.severity === "error" && i.file.endsWith("ledger.jsonl"))
      .map((i) => `${i.line !== undefined ? `line ${i.line}: ` : ""}${i.message}`);
  const existingProblems = ledgerProblems(before.issues);
  if (existingProblems.length > 0) {
    return refused(
      `The ledger has problems, so the next id cannot be trusted. Fix these first (run pnpm validate):\n${bulletList(existingProblems)}`,
    );
  }

  const relative = brickPath(repo);
  const brick = before.bricks.find((b) => b.full === repo);
  if (!brick) {
    const present = loaded.snapshot.brickFiles.some((f) => f.path === relative);
    return refused(
      present
        ? `registry/${relative} has errors. Run pnpm validate, fix it and merge the fix first.`
        : `There is no manifest at registry/${relative}. Merge the brick pull request first.`,
    );
  }
  const brickErrors = before.issues.filter((i) => i.severity === "error" && i.file === brick.file);
  if (brickErrors.length > 0) {
    return refused(`${brick.file} has errors:\n${bulletList(brickErrors.map((i) => i.message))}`);
  }

  // A retired entry cannot get here. A retired repository with a manifest is already a ledger error,
  // and one without a manifest stops at "There is no manifest" above.
  const already = before.ledger.find((e) => e.repo === repo);
  if (already) {
    return refused(`${repo} is already admitted as #${already.id}.`);
  }

  const notes: string[] = [];
  let githubId = options.githubId;
  if (!options.offline) {
    const found = await lookUp(repo, options);
    if (!found.ok) return refused(found.message);
    if (githubId !== undefined && githubId !== found.id) {
      return refused(
        `--github-id ${githubId} does not match the id GitHub reports for ${repo} (${found.id}).`,
      );
    }
    githubId = found.id;
  }

  const sameId = before.ledger.find((e) => e.githubId === githubId);
  if (sameId) {
    return refused(
      `GitHub id ${githubId} already belongs to #${sameId.id} (${sameId.repo}). This is the same repository under another name, so it is a duplicate.`,
    );
  }

  const id = before.ledger.length + 1;
  const entry: Record<string, unknown> = {
    id,
    repo,
    githubId,
    admitted: options.date ?? localDate(now),
    ...(options.by !== undefined ? { by: options.by } : {}),
    impact,
    ...(options.incubating ? { incubating: true } : {}),
  };
  if (options.by === undefined) {
    notes.push("No maintainer name was recorded. Pass --by with your GitHub login next time.");
  }
  const line = JSON.stringify(entry);

  const existing = loaded.snapshot.ledgerText ?? "";
  const eol = existing.includes("\r\n") ? "\r\n" : "\n";
  const addition = `${existing !== "" && !existing.endsWith("\n") ? eol : ""}${line}${eol}`;

  // Check the registry as it will be, before touching the disk.
  const after = validateRegistry(
    { ...loaded.snapshot, ledgerText: existing + addition },
    validationOptions,
  );
  const newProblems = ledgerProblems(after.issues);
  if (newProblems.length > 0) {
    return refused(
      `That line would break the ledger, so nothing was written:\n${bulletList(newProblems)}`,
    );
  }

  if (!options.dryRun) appendFileSync(join(options.rootDir, "ledger.jsonl"), addition);
  return { ok: true, id, line, wrote: !options.dryRun, notes };
}
