import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Applies the repository settings the docs promise: labels, topics, security features, Actions
 * permissions, a protection ruleset, the first issues and the review pool pull requests.
 *
 * It prints a plan and changes nothing unless `--apply` is given. Request shapes were checked
 * against GitHub's REST API description. The token is only ever sent to api.github.com.
 */

// ---------------------------------------------------------------------------------------------
// Types

export type Step =
  | "settings"
  | "topics"
  | "security"
  | "actions"
  | "labels"
  | "issues"
  | "pulls"
  | "ruleset";

/** The order matters: labels before issues, and the ruleset last so nothing is blocked mid-run. */
export const STEPS: readonly Step[] = [
  "settings",
  "topics",
  "security",
  "actions",
  "labels",
  "issues",
  "pulls",
  "ruleset",
];

export interface Operation {
  step: Step;
  /** One plain line for the plan, for example "create label type/brick". */
  summary: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
}

export interface RepoRef {
  owner: string;
  name: string;
}

const REPO_PART = /^[A-Za-z0-9._-]{1,100}$/;

export function parseRepo(value: string): RepoRef {
  const parts = value.split("/");
  const [owner, name] = parts;
  if (parts.length !== 2 || !owner || !name || !REPO_PART.test(owner) || !REPO_PART.test(name)) {
    throw new Error(
      `"${value}" is not a repository. Use owner/name, for example kush07upadhyay/GitPyramid.`,
    );
  }
  return { owner, name: name.replace(/\.git$/, "") };
}

/** Reads owner/name from a remote URL in https or ssh form. */
export function repoFromRemote(url: string): RepoRef {
  const match = url.trim().match(/github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/);
  if (!match)
    throw new Error(
      `Cannot read a GitHub repository from the remote "${url}". Pass --repo owner/name.`,
    );
  return parseRepo(`${match[1]}/${match[2]}`);
}

const base = (repo: RepoRef) => `/repos/${repo.owner}/${repo.name}`;

// ---------------------------------------------------------------------------------------------
// Labels: a strict reader for the small subset of YAML in .github/labels.yml

export interface Label {
  name: string;
  color: string;
  description: string;
}

function unquote(raw: string, line: number): string {
  const value = raw.trim();
  if (value.startsWith('"')) {
    try {
      return JSON.parse(value) as string;
    } catch {
      throw new Error(`labels.yml line ${line}: a quoted value is not valid.`);
    }
  }
  return value;
}

export function parseLabels(yaml: string): Label[] {
  const labels: Label[] = [];
  let current: Partial<Label> | undefined;
  const finish = (line: number) => {
    if (!current) return;
    for (const key of ["name", "color", "description"] as const) {
      if (!current[key])
        throw new Error(`labels.yml: the label ending near line ${line} has no ${key}.`);
    }
    labels.push(current as Label);
  };
  const lines = yaml.split(/\r?\n/);
  lines.forEach((raw, index) => {
    const line = index + 1;
    const text = raw.replace(/\s+$/, "");
    if (text === "" || text.trimStart().startsWith("#")) return;
    const start = text.match(/^- name:\s*(.+)$/);
    if (start) {
      finish(line);
      current = { name: unquote(start[1] as string, line) };
      return;
    }
    const field = text.match(/^ {2}(color|description):\s*(.+)$/);
    if (field && current) {
      current[field[1] as "color" | "description"] = unquote(field[2] as string, line);
      return;
    }
    throw new Error(`labels.yml line ${line}: unexpected text "${text}".`);
  });
  finish(lines.length);

  const seen = new Set<string>();
  for (const label of labels) {
    if (!/^[0-9A-Fa-f]{6}$/.test(label.color))
      throw new Error(`Label "${label.name}" has a bad color "${label.color}".`);
    if (label.name.length > 50)
      throw new Error(`Label "${label.name}" is longer than 50 characters.`);
    if (label.description.length > 100)
      throw new Error(`Label "${label.name}" has a description over 100 characters.`);
    const key = label.name.toLowerCase();
    if (seen.has(key))
      throw new Error(
        `Label "${label.name}" appears twice. GitHub treats names as case-insensitive.`,
      );
    seen.add(key);
  }
  return labels;
}

/** GitHub's own starter labels. Removed only when the maintainer asks, because it is destructive. */
export const DEFAULT_LABELS = [
  "bug",
  "documentation",
  "duplicate",
  "enhancement",
  "invalid",
  "question",
  "wontfix",
];

export interface ExistingLabel {
  name: string;
  color: string;
  description: string | null;
}

export function planLabels(
  repo: RepoRef,
  existing: readonly ExistingLabel[],
  desired: readonly Label[],
  options: { pruneDefaults?: boolean } = {},
): Operation[] {
  const ops: Operation[] = [];
  const byName = new Map(existing.map((l) => [l.name.toLowerCase(), l]));
  for (const label of desired) {
    const found = byName.get(label.name.toLowerCase());
    if (!found) {
      ops.push({
        step: "labels",
        summary: `create label ${label.name}`,
        method: "POST",
        path: `${base(repo)}/labels`,
        body: { name: label.name, color: label.color, description: label.description },
      });
    } else if (
      found.color.toLowerCase() !== label.color.toLowerCase() ||
      (found.description ?? "") !== label.description ||
      found.name !== label.name
    ) {
      ops.push({
        step: "labels",
        summary: `update label ${found.name}`,
        method: "PATCH",
        path: `${base(repo)}/labels/${encodeURIComponent(found.name)}`,
        body: { new_name: label.name, color: label.color, description: label.description },
      });
    }
  }
  if (options.pruneDefaults) {
    const wanted = new Set(desired.map((l) => l.name.toLowerCase()));
    for (const name of DEFAULT_LABELS) {
      const found = byName.get(name);
      if (found && !wanted.has(name)) {
        ops.push({
          step: "labels",
          summary: `delete the starter label ${found.name}`,
          method: "DELETE",
          path: `${base(repo)}/labels/${encodeURIComponent(found.name)}`,
        });
      }
    }
  }
  return ops;
}

// ---------------------------------------------------------------------------------------------
// Seed issues: a readable Markdown file is the source of truth

export interface SeedIssue {
  title: string;
  labels: string[];
  body: string;
}

/**
 * Format: an intro, then one `## Title` section per issue. The first line of a section is
 * `Labels: a, b`. The rest is the issue body. Use `###` for headings inside a body.
 */
export function parseSeedIssues(markdown: string): SeedIssue[] {
  // Split at every line that starts a section. Anything before the first one is the intro. Using a
  // line-start match means a file that begins directly with a section does not lose its first issue.
  const sections = markdown.split(/^(?=## )/m).filter((part) => part.startsWith("## "));
  const issues: SeedIssue[] = [];
  for (const section of sections) {
    const lines = section.split(/\r?\n/);
    const title = (lines.shift() as string).replace(/^##\s+/, "").trim();
    while (lines.length > 0 && (lines[0] as string).trim() === "") lines.shift();
    const labelLine = (lines.shift() ?? "").match(/^Labels:\s*(.+)$/);
    if (!labelLine) throw new Error(`Seed issue "${title}" must start with a "Labels: a, b" line.`);
    const labels = (labelLine[1] as string)
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
    const body = lines.join("\n").trim();
    if (title === "" || title.length > 100)
      throw new Error(`Seed issue title "${title}" must be 1 to 100 characters.`);
    if (labels.length === 0) throw new Error(`Seed issue "${title}" has no labels.`);
    if (body === "") throw new Error(`Seed issue "${title}" has no body.`);
    issues.push({ title, labels, body });
  }
  const titles = new Set<string>();
  for (const issue of issues) {
    const key = issue.title.toLowerCase();
    if (titles.has(key)) throw new Error(`Seed issue "${issue.title}" appears twice.`);
    titles.add(key);
  }
  return issues;
}

export function planIssues(
  repo: RepoRef,
  existingTitles: readonly string[],
  wanted: readonly SeedIssue[],
): Operation[] {
  const have = new Set(existingTitles.map((t) => t.toLowerCase()));
  return wanted
    .filter((issue) => !have.has(issue.title.toLowerCase()))
    .map((issue) => ({
      step: "issues" as const,
      summary: `open issue "${issue.title}"`,
      method: "POST" as const,
      path: `${base(repo)}/issues`,
      body: { title: issue.title, body: issue.body, labels: issue.labels },
    }));
}

// ---------------------------------------------------------------------------------------------
// Settings, topics, security, Actions and the ruleset

export const DESCRIPTION =
  "An open registry of the open-source projects developers need, explored as a 3D pyramid. Add a brick in 10 minutes.";

export const TOPICS = [
  "open-source",
  "developer-tools",
  "software-registry",
  "threejs",
  "webgl",
  "react-three-fiber",
  "typescript",
  "data-visualization",
];

export function planSettings(
  repo: RepoRef,
  options: { homepage?: string | undefined } = {},
): Operation[] {
  const body: Record<string, unknown> = {
    description: DESCRIPTION,
    has_issues: true,
    has_projects: false,
    has_wiki: false,
    allow_squash_merge: true,
    allow_merge_commit: false,
    allow_rebase_merge: false,
    allow_auto_merge: false,
    delete_branch_on_merge: true,
    allow_update_branch: true,
    squash_merge_commit_title: "PR_TITLE",
    squash_merge_commit_message: "BLANK",
    security_and_analysis: {
      secret_scanning: { status: "enabled" },
      secret_scanning_push_protection: { status: "enabled" },
    },
  };
  if (options.homepage) body.homepage = options.homepage;
  return [
    {
      step: "settings",
      summary: "set the description, squash-only merging, branch cleanup and secret scanning",
      method: "PATCH",
      path: base(repo),
      body,
    },
  ];
}

export function planTopics(repo: RepoRef): Operation[] {
  return [
    {
      step: "topics",
      summary: `set ${TOPICS.length} topics`,
      method: "PUT",
      path: `${base(repo)}/topics`,
      body: { names: TOPICS },
    },
  ];
}

export function planSecurity(repo: RepoRef): Operation[] {
  return [
    ["turn on private vulnerability reporting", "private-vulnerability-reporting"],
    ["turn on Dependabot alerts", "vulnerability-alerts"],
    ["turn on Dependabot security updates", "automated-security-fixes"],
  ].map(([summary, endpoint]) => ({
    step: "security" as const,
    summary: summary as string,
    method: "PUT" as const,
    path: `${base(repo)}/${endpoint}`,
  }));
}

export function planActions(repo: RepoRef): Operation[] {
  return [
    {
      step: "actions",
      summary: "require every action to be pinned to a full commit SHA",
      method: "PUT",
      path: `${base(repo)}/actions/permissions`,
      body: { enabled: true, allowed_actions: "all", sha_pinning_required: true },
    },
    {
      step: "actions",
      summary: "make workflow tokens read-only and stop Actions approving pull requests",
      method: "PUT",
      path: `${base(repo)}/actions/permissions/workflow`,
      body: { default_workflow_permissions: "read", can_approve_pull_request_reviews: false },
    },
    {
      step: "actions",
      summary: "make checks on pull requests from forks wait for a maintainer to approve each run",
      method: "PUT",
      path: `${base(repo)}/actions/permissions/fork-pr-contributor-approval`,
      body: { approval_policy: "all_external_contributors" },
    },
  ];
}

export const RULESET_NAME = "Protect main";
/** The job names in .github/workflows/ci.yml. */
export const REQUIRED_CHECKS = ["check", "pr-rules"];

/**
 * A personal repository cannot use the organization admin bypass, and GitHub does not let an
 * author approve their own pull request. So the ruleset requires a pull request, passing checks,
 * squash merging and resolved threads, but not an approval. It ships with no bypass. A maintainer
 * who wants to push ledger commits directly can add themselves to the bypass list by hand
 * (docs/NEXT_STEPS.md). A re-run keeps whatever bypass list exists. Turn on code owner review when a
 * second maintainer joins.
 */
export function rulesetBody(bypassActors: readonly unknown[] = []) {
  return {
    name: RULESET_NAME,
    target: "branch",
    enforcement: "active",
    ...(bypassActors.length > 0 ? { bypass_actors: bypassActors } : {}),
    conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
    rules: [
      { type: "deletion" },
      { type: "non_fast_forward" },
      { type: "required_linear_history" },
      {
        type: "pull_request",
        parameters: {
          required_approving_review_count: 0,
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_review_thread_resolution: true,
          allowed_merge_methods: ["squash"],
        },
      },
      {
        type: "required_status_checks",
        parameters: {
          strict_required_status_checks_policy: false,
          required_status_checks: REQUIRED_CHECKS.map((context) => ({ context })),
        },
      },
    ],
  };
}

export function planRuleset(
  repo: RepoRef,
  existing: readonly { id: number; name: string; bypass_actors?: readonly unknown[] }[],
): Operation[] {
  const found = existing.find((r) => r.name === RULESET_NAME);
  return [
    found
      ? {
          step: "ruleset",
          summary: `update the "${RULESET_NAME}" ruleset`,
          method: "PUT",
          path: `${base(repo)}/rulesets/${found.id}`,
          body: rulesetBody(found.bypass_actors ?? []),
        }
      : {
          step: "ruleset",
          summary: `create the "${RULESET_NAME}" ruleset`,
          method: "POST",
          path: `${base(repo)}/rulesets`,
          body: rulesetBody(),
        },
  ];
}

// ---------------------------------------------------------------------------------------------
// Review pool pull requests

export interface PoolBranch {
  branch: string;
  /** First line of the branch's commit message, used as the pull request title. */
  subject: string;
  /** The manifest the branch adds. */
  file: string;
}

export function poolBody(repo: RepoRef, file: string): string {
  const rule = `https://github.com/${repo.owner}/${repo.name}/blob/main/GOVERNANCE.md#the-review-rule-4-for-1`;
  return [
    `This pull request is open on purpose. It is part of the **review pool**, so newcomers have a real brick to review before they add their own (see [the review rule](${rule})).`,
    "",
    `Please review \`${file}\` under **Files changed**. Open the repository it describes and check, in your own words:`,
    "",
    "- the license against the project's license file",
    "- the one sentence against its README",
    "- the sector, category and tags",
    "- whether it is a duplicate of a listed brick, or belongs in an `alternatives` list",
    "",
    'A review counts when it names something specific that you verified. "Looks good" does not count.',
    "",
    "Maintainer-authored, so the 4-for-1 requirement does not apply to this pull request itself.",
  ].join("\n");
}

export function planPulls(
  repo: RepoRef,
  branches: readonly PoolBranch[],
  openHeads: readonly string[],
  baseBranch: string,
): Operation[] {
  const open = new Set(openHeads);
  return branches
    .filter((b) => !open.has(b.branch))
    .map((b) => ({
      step: "pulls" as const,
      summary: `open a review pool pull request for ${b.branch}`,
      method: "POST" as const,
      path: `${base(repo)}/pulls`,
      body: { title: b.subject, head: b.branch, base: baseBranch, body: poolBody(repo, b.file) },
    }));
}

// ---------------------------------------------------------------------------------------------
// Talking to GitHub

export interface HttpResponse {
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}

export type Http = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<HttpResponse>;

export const API = "https://api.github.com";

export class GitHubApi {
  constructor(
    private readonly http: Http,
    private readonly token: string | undefined,
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((r) => setTimeout(r, ms)),
  ) {}

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "gitpyramid-setup",
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    return headers;
  }

  /** GET one page, or every page of a list. */
  async get<T = unknown>(path: string): Promise<T> {
    const response = await this.http(`${API}${path}`, { method: "GET", headers: this.headers() });
    if (response.status < 200 || response.status >= 300) throw await toError("GET", path, response);
    return (await response.json()) as T;
  }

  async list<T = unknown>(path: string, maxPages = 20): Promise<T[]> {
    const all: T[] = [];
    const joiner = path.includes("?") ? "&" : "?";
    for (let page = 1; page <= maxPages; page++) {
      const items = await this.get<T[]>(`${path}${joiner}per_page=100&page=${page}`);
      all.push(...items);
      if (items.length < 100) break;
    }
    return all;
  }

  /** Pauses for a second after each write, as GitHub asks, to avoid secondary rate limits. */
  async send(op: Operation): Promise<void> {
    const init: { method: string; headers: Record<string, string>; body?: string } = {
      method: op.method,
      headers: this.headers(),
    };
    if (op.body !== undefined) {
      init.body = JSON.stringify(op.body);
      init.headers["Content-Type"] = "application/json";
    }
    const response = await this.http(`${API}${op.path}`, init);
    if (response.status < 200 || response.status >= 300)
      throw await toError(op.method, op.path, response);
    await this.sleep(1000);
  }
}

async function toError(method: string, path: string, response: HttpResponse): Promise<Error> {
  let detail = "";
  try {
    const data = (await response.json()) as { message?: string; errors?: unknown };
    detail = data.message ?? "";
    if (Array.isArray(data.errors) && data.errors.length > 0)
      detail += ` ${JSON.stringify(data.errors)}`;
  } catch {
    // The body was not JSON. The status is enough.
  }
  const hint =
    response.status === 401
      ? " The token is missing or not valid."
      : response.status === 403
        ? " The token may lack a permission, or a rate limit was hit."
        : response.status === 404
          ? " The repository or feature was not found, or the token cannot see it."
          : "";
  return new Error(
    `${method} ${path} failed with ${response.status}: ${detail.trim()}${hint}`.trim(),
  );
}

// ---------------------------------------------------------------------------------------------
// Running

export interface Options {
  apply: boolean;
  repo: RepoRef;
  homepage?: string | undefined;
  baseBranch: string;
  steps: readonly Step[];
  pruneDefaultLabels: boolean;
}

export interface Sources {
  labelsYaml: string;
  seedIssuesMarkdown: string;
  /** Local branches named brick/*, with what the pull request needs. */
  poolBranches: PoolBranch[];
}

export interface Report {
  planned: Operation[];
  applied: number;
  failures: string[];
  notes: string[];
}

export async function runSetup(
  api: GitHubApi,
  options: Options,
  sources: Sources,
): Promise<Report> {
  const { repo } = options;
  const planned: Operation[] = [];
  const failures: string[] = [];
  const notes: string[] = [
    "Discussions cannot be turned on through the API. Do it by hand: Settings, General, Features, Discussions.",
    "A repository social preview image can only be uploaded by hand: Settings, General, Social preview.",
  ];
  const wants = (step: Step) => options.steps.includes(step);

  /**
   * Reads current state from GitHub. When applying, a failed read stops that step, because planning
   * from a guess could duplicate or overwrite things. In a dry run it falls back to an empty state
   * and says so, so the plan can still be shown without a token.
   */
  const read = async <T>(what: string, load: () => Promise<T[]>): Promise<T[]> => {
    try {
      return await load();
    } catch (error) {
      if (options.apply) throw error;
      notes.push(
        `Could not read ${what} (${(error as Error).message}). The plan below assumes there is none.`,
      );
      return [];
    }
  };

  const gather = async (step: Step, build: () => Promise<Operation[]>) => {
    if (!wants(step)) return;
    try {
      planned.push(...(await build()));
    } catch (error) {
      failures.push(`planning ${step}: ${(error as Error).message}`);
    }
  };

  await gather("settings", async () => planSettings(repo, { homepage: options.homepage }));
  await gather("topics", async () => planTopics(repo));
  await gather("security", async () => planSecurity(repo));
  await gather("actions", async () => planActions(repo));
  await gather("labels", async () =>
    planLabels(
      repo,
      await read("the labels", () => api.list<ExistingLabel>(`${base(repo)}/labels`)),
      parseLabels(sources.labelsYaml),
      { pruneDefaults: options.pruneDefaultLabels },
    ),
  );
  await gather("issues", async () => {
    const existing = await read("the issues", () =>
      api.list<{ title: string; pull_request?: unknown }>(`${base(repo)}/issues?state=all`),
    );
    return planIssues(
      repo,
      existing.filter((i) => i.pull_request === undefined).map((i) => i.title),
      parseSeedIssues(sources.seedIssuesMarkdown),
    );
  });
  await gather("pulls", async () => {
    if (sources.poolBranches.length === 0) {
      notes.push(
        "No local brick/* branches were found, so no review pool pull requests were planned.",
      );
      return [];
    }
    const remote = new Set(
      (await read("the branches", () => api.list<{ name: string }>(`${base(repo)}/branches`))).map(
        (b) => b.name,
      ),
    );
    const missing = sources.poolBranches.filter((b) => !remote.has(b.branch));
    if (missing.length > 0) {
      notes.push(
        `Push these branches first, then run again: ${missing.map((b) => b.branch).join(", ")}.`,
      );
    }
    const pushed = sources.poolBranches.filter((b) => remote.has(b.branch));
    const open = await read("the open pull requests", () =>
      api.list<{ head: { ref: string } }>(`${base(repo)}/pulls?state=open`),
    );
    return planPulls(
      repo,
      pushed,
      open.map((p) => p.head.ref),
      options.baseBranch,
    );
  });
  await gather("ruleset", async () => {
    const summaries = await read("the rulesets", () =>
      api.list<{ id: number; name: string }>(`${base(repo)}/rulesets`),
    );
    // The list leaves out the bypass actors, so fetch the full ruleset to keep a hand-made bypass.
    const found = summaries.find((r) => r.name === RULESET_NAME);
    const detailed =
      found === undefined
        ? summaries
        : [
            await api.get<{ id: number; name: string; bypass_actors?: unknown[] }>(
              `${base(repo)}/rulesets/${found.id}`,
            ),
          ];
    return planRuleset(repo, detailed);
  });

  let applied = 0;
  if (options.apply) {
    for (const op of planned) {
      try {
        await api.send(op);
        applied++;
      } catch (error) {
        failures.push(`${op.summary}: ${(error as Error).message}`);
      }
    }
  }
  return { planned, applied, failures, notes };
}

// ---------------------------------------------------------------------------------------------
// Command line

function parseArgs(argv: string[]) {
  const flags = new Map<string, string | true>();
  const valued = new Set(["repo", "homepage", "only", "skip", "base"]);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument "${arg}".`);
    const name = arg.slice(2);
    if (valued.has(name)) {
      const value = argv[++i];
      if (value === undefined || value.startsWith("--"))
        throw new Error(`--${name} needs a value.`);
      flags.set(name, value);
    } else if (name === "apply" || name === "prune-default-labels" || name === "verbose") {
      flags.set(name, true);
    } else {
      throw new Error(`Unknown option --${name}.`);
    }
  }
  return flags;
}

export function selectSteps(only?: string, skip?: string): Step[] {
  const parse = (value: string | undefined, label: string): Step[] =>
    (value ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        if (!STEPS.includes(s as Step))
          throw new Error(`Unknown step "${s}" in --${label}. Steps: ${STEPS.join(", ")}.`);
        return s as Step;
      });
  const chosen = only ? parse(only, "only") : [...STEPS];
  const skipped = new Set(parse(skip, "skip"));
  return STEPS.filter((s) => chosen.includes(s) && !skipped.has(s));
}

function git(args: string[], cwd?: string): string {
  return execFileSync("git", args, { encoding: "utf8", ...(cwd ? { cwd } : {}) }).trim();
}

/** Local brick/* branches that add exactly one manifest and nothing else. */
export function localPoolBranches(baseBranch: string, cwd?: string): PoolBranch[] {
  const names = git(["for-each-ref", "--format=%(refname:short)", "refs/heads/brick/"], cwd)
    .split("\n")
    .filter(Boolean);
  const pool: PoolBranch[] = [];
  for (const branch of names) {
    const files = git(["diff", "--name-only", `${baseBranch}...${branch}`], cwd)
      .split("\n")
      .filter(Boolean);
    const manifest = files.find((f) => /^registry\/bricks\/.+\.json$/.test(f));
    if (!manifest || files.length !== 1) continue;
    const subject = git(["log", "-1", "--format=%s", branch], cwd);
    pool.push({ branch, subject, file: manifest });
  }
  return pool;
}

export async function main(argv: string[]): Promise<number> {
  const flags = parseArgs(argv);
  const apply = flags.has("apply");
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const baseBranch = (flags.get("base") as string | undefined) ?? "main";
  const repo = flags.has("repo")
    ? parseRepo(flags.get("repo") as string)
    : repoFromRemote(git(["remote", "get-url", "origin"]));
  if (apply && !token) {
    console.error(
      "--apply needs a token. Set GITHUB_TOKEN in your terminal session (see docs/NEXT_STEPS.md). Never paste a token into a file, a chat or a commit.",
    );
    return 2;
  }
  const options: Options = {
    apply,
    repo,
    homepage: flags.get("homepage") as string | undefined,
    baseBranch,
    steps: selectSteps(
      flags.get("only") as string | undefined,
      flags.get("skip") as string | undefined,
    ),
    pruneDefaultLabels: flags.has("prune-default-labels"),
  };
  const root = resolve(process.cwd());
  const sources: Sources = {
    labelsYaml: readFileSync(resolve(root, ".github/labels.yml"), "utf8"),
    seedIssuesMarkdown: readFileSync(resolve(root, "docs/launch/seed-issues.md"), "utf8"),
    poolBranches: options.steps.includes("pulls") ? localPoolBranches(baseBranch) : [],
  };

  const api = new GitHubApi((url, init) => fetch(url, init) as Promise<HttpResponse>, token);
  console.log(
    `${apply ? "APPLYING" : "DRY RUN (nothing will change)"} for ${repo.owner}/${repo.name}\n`,
  );
  const report = await runSetup(api, options, sources);
  for (const op of report.planned) {
    console.log(`  ${op.method.padEnd(6)} ${op.summary}`);
    if (flags.has("verbose"))
      console.log(`         ${op.path}${op.body ? `\n         ${JSON.stringify(op.body)}` : ""}`);
  }
  if (report.planned.length === 0) console.log("  Nothing to change.");
  console.log(
    apply
      ? `\n${report.applied} of ${report.planned.length} changes applied.`
      : `\n${report.planned.length} changes planned. Run again with --apply to make them.`,
  );
  for (const note of report.notes) console.log(`Note: ${note}`);
  for (const failure of report.failures) console.error(`Problem: ${failure}`);
  return report.failures.length > 0 ? 1 : 0;
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("github-setup.ts") || entry.endsWith("github-setup.js")) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(2);
    },
  );
}
