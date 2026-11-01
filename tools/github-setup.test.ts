import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  API,
  DEFAULT_LABELS,
  DESCRIPTION,
  GitHubApi,
  type Http,
  type HttpResponse,
  localPoolBranches,
  main,
  type Operation,
  type Options,
  parseLabels,
  parseRepo,
  parseSeedIssues,
  planActions,
  planIssues,
  planLabels,
  planPulls,
  planRuleset,
  planSecurity,
  planSettings,
  planTopics,
  poolBody,
  REQUIRED_CHECKS,
  repoFromRemote,
  rulesetBody,
  runSetup,
  STEPS,
  selectSteps,
  TOPICS,
} from "./github-setup";

const repo = { owner: "kush07upadhyay", name: "GitPyramid" };
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

// ---------------------------------------------------------------------------------------------
describe("repository names", () => {
  it.each([
    ["kush07upadhyay/GitPyramid", "kush07upadhyay", "GitPyramid"],
    ["a/b.js", "a", "b.js"],
    ["owner/name.git", "owner", "name"],
  ])("parseRepo(%s)", (value, owner, name) => {
    expect(parseRepo(value)).toEqual({ owner, name });
  });

  it.each(["", "one", "a/b/c", "/b", "a/", "a b/c", "a/b c", "a/../b", "https://github.com/a/b"])(
    "parseRepo rejects %j",
    (value) => {
      expect(() => parseRepo(value)).toThrow("is not a repository");
    },
  );

  it.each([
    ["https://github.com/kush07upadhyay/GitPyramid.git", "GitPyramid"],
    ["https://github.com/kush07upadhyay/GitPyramid", "GitPyramid"],
    ["https://github.com/kush07upadhyay/GitPyramid/", "GitPyramid"],
    ["git@github.com:kush07upadhyay/GitPyramid.git", "GitPyramid"],
    ["https://x-access-token:secret@github.com/kush07upadhyay/GitPyramid.git", "GitPyramid"],
  ])("repoFromRemote(%s)", (url, name) => {
    expect(repoFromRemote(url)).toEqual({ owner: "kush07upadhyay", name });
  });

  it.each(["https://gitlab.com/a/b.git", "not a url", ""])("repoFromRemote rejects %j", (url) => {
    expect(() => repoFromRemote(url)).toThrow("Cannot read a GitHub repository");
  });
});

// ---------------------------------------------------------------------------------------------
describe("labels.yml", () => {
  const labels = parseLabels(read(".github/labels.yml"));

  it("parses the real file", () => {
    expect(labels).toHaveLength(24);
    expect(new Set(labels.map((l) => l.name.toLowerCase())).size).toBe(24);
    for (const l of labels) {
      expect(l.color).toMatch(/^[0-9A-Fa-f]{6}$/);
      expect(l.description.length).toBeLessThanOrEqual(100);
      expect(l.name.length).toBeLessThanOrEqual(50);
    }
  });

  it("has the labels the issue forms and docs rely on", () => {
    const names = new Set(labels.map((l) => l.name));
    for (const name of [
      "type/brick",
      "good first issue",
      "help wanted",
      "needs-review",
      "constitution",
    ]) {
      expect(names.has(name)).toBe(true);
    }
  });

  it("ignores comments, blank lines and Windows line endings", () => {
    const yaml = '# note\r\n\r\n- name: a\r\n  color: "ABCDEF"\r\n  description: Hello there\r\n';
    expect(parseLabels(yaml)).toEqual([{ name: "a", color: "ABCDEF", description: "Hello there" }]);
  });

  it.each([
    ["an unexpected line", "- name: a\n  colour: x\n", "line 2"],
    ["a missing color", "- name: a\n  description: d\n", "has no color"],
    ["a missing description", '- name: a\n  color: "ABCDEF"\n', "has no description"],
    ["a bad color", '- name: a\n  color: "XYZ"\n  description: d\n', "bad color"],
    [
      "a duplicate, case-insensitive",
      '- name: A\n  color: "ABCDEF"\n  description: d\n- name: a\n  color: "ABCDEF"\n  description: d\n',
      "appears twice",
    ],
    ["a broken quoted value", '- name: "oops\n  color: "ABCDEF"\n  description: d\n', "not valid"],
    [
      "a description over 100 characters",
      `- name: a\n  color: "ABCDEF"\n  description: ${"x".repeat(101)}\n`,
      "over 100",
    ],
  ])("rejects %s", (_name, yaml, message) => {
    expect(() => parseLabels(yaml)).toThrow(message);
  });
});

describe("planLabels", () => {
  const desired = [
    { name: "type/brick", color: "12B5CB", description: "Add or change a registry brick" },
    { name: "good first issue", color: "7057FF", description: "Good for a first contribution" },
  ];

  it("creates missing labels", () => {
    const ops = planLabels(repo, [], desired);
    expect(ops.map((o) => `${o.method} ${o.summary}`)).toEqual([
      "POST create label type/brick",
      "POST create label good first issue",
    ]);
    expect(ops[0]).toMatchObject({ path: "/repos/kush07upadhyay/GitPyramid/labels" });
    expect(ops[0]?.body).toEqual({
      name: "type/brick",
      color: "12B5CB",
      description: "Add or change a registry brick",
    });
  });

  it("does nothing when a label already matches, ignoring the case of the color", () => {
    const existing = [
      { name: "type/brick", color: "12b5cb", description: "Add or change a registry brick" },
      { name: "good first issue", color: "7057FF", description: "Good for a first contribution" },
    ];
    expect(planLabels(repo, existing, desired)).toEqual([]);
  });

  it("updates a label whose color or description differs, and encodes its name", () => {
    const existing = [
      { name: "type/brick", color: "000000", description: "Add or change a registry brick" },
      { name: "good first issue", color: "7057FF", description: null },
    ];
    const ops = planLabels(repo, existing, desired);
    expect(ops.map((o) => `${o.method} ${o.path}`)).toEqual([
      "PATCH /repos/kush07upadhyay/GitPyramid/labels/type%2Fbrick",
      "PATCH /repos/kush07upadhyay/GitPyramid/labels/good%20first%20issue",
    ]);
  });

  it("fixes a label that only differs in letter case, because names are case-insensitive", () => {
    const existing = [
      { name: "Good First Issue", color: "7057FF", description: "Good for a first contribution" },
    ];
    const ops = planLabels(repo, existing, [desired[1] as (typeof desired)[number]]);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({
      method: "PATCH",
      path: expect.stringContaining("Good%20First%20Issue"),
    });
    expect(ops[0]?.body).toMatchObject({ new_name: "good first issue" });
  });

  it("keeps GitHub's starter labels unless asked", () => {
    const starters = DEFAULT_LABELS.map((name) => ({ name, color: "ededed", description: "x" }));
    expect(planLabels(repo, starters, [])).toEqual([]);
  });

  it("deletes only the starter labels when asked, and never one we want or one we do not know", () => {
    const existing = [
      ...DEFAULT_LABELS.map((name) => ({ name, color: "ededed", description: "x" })),
      { name: "my custom label", color: "ededed", description: "x" },
      { name: "type/brick", color: "12B5CB", description: "Add or change a registry brick" },
    ];
    const ops = planLabels(repo, existing, desired, { pruneDefaults: true });
    const deleted = ops
      .filter((o) => o.method === "DELETE")
      .map((o) => decodeURIComponent(o.path.split("/").pop() as string));
    expect(deleted.sort()).toEqual([...DEFAULT_LABELS].sort());
    expect(deleted).not.toContain("my custom label");
  });

  it("does not delete a starter label that the desired set also contains", () => {
    const existing = [{ name: "bug", color: "ededed", description: "x" }];
    const wanted = [{ name: "bug", color: "ededed", description: "x" }];
    expect(planLabels(repo, existing, wanted, { pruneDefaults: true })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
describe("seed issues", () => {
  const issues = parseSeedIssues(read("docs/launch/seed-issues.md"));
  const labels = new Set(parseLabels(read(".github/labels.yml")).map((l) => l.name));

  it("parses the real file into a useful number of issues", () => {
    expect(issues.length).toBeGreaterThanOrEqual(12);
  });

  it("uses only labels that exist, and unique titles of a sensible length", () => {
    const titles = new Set<string>();
    for (const issue of issues) {
      for (const label of issue.labels)
        expect(labels.has(label), `${issue.title}: ${label}`).toBe(true);
      expect(issue.title.length).toBeLessThanOrEqual(100);
      expect(issue.body.length).toBeGreaterThan(100);
      expect(titles.has(issue.title.toLowerCase())).toBe(false);
      titles.add(issue.title.toLowerCase());
    }
  });

  it("has no em dashes or en dashes", () => {
    expect(read("docs/launch/seed-issues.md")).not.toMatch(/[\u2013\u2014]/);
  });

  it("suggests no project that is already a brick or part of the review pool", () => {
    const text = read("docs/launch/seed-issues.md");
    const ideas = [...text.matchAll(/^- `([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+)`/gm)].map((m) =>
      (m[1] as string).toLowerCase(),
    );
    expect(ideas.length).toBeGreaterThanOrEqual(30);
    const ledger = read("registry/ledger.jsonl")
      .split("\n")
      .filter(Boolean)
      .map((l) => (JSON.parse(l) as { repo: string }).repo);
    const pool = [
      "vitejs/vite",
      "prisma/orm",
      "grafana/grafana",
      "ggml-org/llama.cpp",
      "denoland/deno",
    ];
    for (const idea of ideas) {
      expect(ledger, idea).not.toContain(idea);
      expect(pool, idea).not.toContain(idea);
    }
  });

  it("covers every sector with a claim issue, and the other kinds of work", () => {
    const titles = issues.map((i) => i.title).join("\n");
    for (const sector of ["Systems", "Frontend", "Backend", "AI", "DevOps"])
      expect(titles).toContain(sector);
    expect(titles).toMatch(/Verify the 14 seed bricks/);
    expect(titles).toMatch(/Spike/);
  });

  it.each([
    ["a missing labels line", "# i\n\n## T\n\nJust text\n", 'must start with a "Labels'],
    ["no labels", "## T\n\nLabels: \n\nBody\n", "no labels"],
    ["no body", "## T\n\nLabels: a\n", "no body"],
    [
      "a duplicate title",
      "## T\n\nLabels: a\n\nBody\n\n## t\n\nLabels: a\n\nBody\n",
      "appears twice",
    ],
    ["a title over 100 characters", `## ${"x".repeat(101)}\n\nLabels: a\n\nBody\n`, "1 to 100"],
  ])("rejects %s", (_name, markdown, message) => {
    expect(() => parseSeedIssues(markdown)).toThrow(message);
  });

  it("keeps ### headings inside a body", () => {
    const [issue] = parseSeedIssues("## T\n\nLabels: a, b\n\nIntro\n\n### Sub\n\nMore\n");
    expect(issue?.labels).toEqual(["a", "b"]);
    expect(issue?.body).toBe("Intro\n\n### Sub\n\nMore");
  });
});

describe("planIssues", () => {
  const wanted = [
    { title: "One", labels: ["a"], body: "x" },
    { title: "Two", labels: ["b"], body: "y" },
  ];

  it("opens only the issues that do not exist yet, ignoring case", () => {
    const ops = planIssues(repo, ["one"], wanted);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({
      method: "POST",
      body: { title: "Two", labels: ["b"], body: "y" },
    });
  });

  it("does nothing when they all exist", () => {
    expect(planIssues(repo, ["One", "Two"], wanted)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
describe("repository configuration", () => {
  // The fields GitHub documents for updating a repository. A typo would be ignored or rejected.
  const DOCUMENTED = new Set([
    "description",
    "homepage",
    "has_issues",
    "has_projects",
    "has_wiki",
    "allow_squash_merge",
    "allow_merge_commit",
    "allow_rebase_merge",
    "allow_auto_merge",
    "delete_branch_on_merge",
    "allow_update_branch",
    "squash_merge_commit_title",
    "squash_merge_commit_message",
    "security_and_analysis",
  ]);

  it("uses only documented fields, and not has_discussions, which the API does not offer", () => {
    const [op] = planSettings(repo, { homepage: "https://example.dev" });
    const keys = Object.keys(op?.body as object);
    for (const key of keys) expect(DOCUMENTED.has(key), key).toBe(true);
    expect(keys).not.toContain("has_discussions");
  });

  it("allows squash merging only, matching CONTRIBUTING", () => {
    const body = planSettings(repo)[0]?.body as Record<string, unknown>;
    expect(body).toMatchObject({
      allow_squash_merge: true,
      allow_merge_commit: false,
      allow_rebase_merge: false,
      squash_merge_commit_title: "PR_TITLE",
      delete_branch_on_merge: true,
    });
    expect(read("CONTRIBUTING.md")).toContain("squash-merge");
  });

  it("only sets the homepage when one is given", () => {
    expect(planSettings(repo)[0]?.body).not.toHaveProperty("homepage");
    expect(planSettings(repo, { homepage: "https://gitpyramid.example" })[0]?.body).toHaveProperty(
      "homepage",
    );
  });

  it("describes the project without claiming anything unverified", () => {
    expect(DESCRIPTION.length).toBeLessThanOrEqual(350);
    expect(DESCRIPTION).not.toMatch(/[\u2013\u2014]/);
  });

  it("sets valid topics", () => {
    const op = planTopics(repo)[0] as Operation;
    const names = (op.body as { names: string[] }).names;
    expect(names.length).toBeLessThanOrEqual(20);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z0-9][a-z0-9-]{0,49}$/);
    expect(names).toEqual(TOPICS);
  });

  it("turns on the three security features with no request body", () => {
    const ops = planSecurity(repo);
    expect(ops.map((o) => o.path.split("/").pop())).toEqual([
      "private-vulnerability-reporting",
      "vulnerability-alerts",
      "automated-security-fixes",
    ]);
    for (const op of ops) {
      expect(op.method).toBe("PUT");
      expect(op.body).toBeUndefined();
    }
  });

  it("requires pinned actions and read-only workflow tokens", () => {
    const [permissions, workflow] = planActions(repo);
    expect(permissions?.body).toMatchObject({ enabled: true, sha_pinning_required: true });
    expect(workflow?.body).toEqual({
      default_workflow_permissions: "read",
      can_approve_pull_request_reviews: false,
    });
  });
});

describe("the main branch ruleset", () => {
  it("requires exactly the job names that exist in the CI workflow", () => {
    const workflow = read(".github/workflows/ci.yml");
    for (const check of REQUIRED_CHECKS) expect(workflow).toContain(`name: ${check}`);
  });

  it("sets every field GitHub requires for the pull request rule", () => {
    const rule = rulesetBody().rules.find((r) => r.type === "pull_request") as {
      parameters: Record<string, unknown>;
    };
    for (const key of [
      "required_approving_review_count",
      "dismiss_stale_reviews_on_push",
      "require_code_owner_review",
      "require_last_push_approval",
      "required_review_thread_resolution",
    ]) {
      expect(rule.parameters, key).toHaveProperty(key);
    }
    expect(rule.parameters.allowed_merge_methods).toEqual(["squash"]);
  });

  it("protects the default branch from deletion and force pushes, and wants a linear history", () => {
    const body = rulesetBody();
    expect(body.conditions.ref_name.include).toEqual(["~DEFAULT_BRANCH"]);
    expect(body.rules.map((r) => r.type)).toEqual(
      expect.arrayContaining([
        "deletion",
        "non_fast_forward",
        "required_linear_history",
        "required_status_checks",
      ]),
    );
    expect(body.enforcement).toBe("active");
  });

  it("ships with no bypass, and keeps a hand-made one", () => {
    expect(rulesetBody()).not.toHaveProperty("bypass_actors");
    const bypass = [{ actor_id: 123, actor_type: "User", bypass_mode: "pull_request" }];
    expect(rulesetBody(bypass)).toHaveProperty("bypass_actors", bypass);
  });

  it("is created when missing and updated, with its bypass preserved, when present", () => {
    expect(planRuleset(repo, [])[0]).toMatchObject({
      method: "POST",
      path: "/repos/kush07upadhyay/GitPyramid/rulesets",
    });
    const bypass = [{ actor_id: 1, actor_type: "User", bypass_mode: "always" }];
    const [update] = planRuleset(repo, [{ id: 42, name: "Protect main", bypass_actors: bypass }]);
    expect(update).toMatchObject({
      method: "PUT",
      path: "/repos/kush07upadhyay/GitPyramid/rulesets/42",
    });
    expect(update?.body).toHaveProperty("bypass_actors", bypass);
    expect(planRuleset(repo, [{ id: 7, name: "Someone else's" }])[0]?.method).toBe("POST");
  });
});

describe("review pool pull requests", () => {
  const branches = [
    {
      branch: "brick/vitejs-vite",
      subject: "feat(registry): add vitejs/vite",
      file: "registry/bricks/vitejs/vite.json",
    },
    {
      branch: "brick/grafana-grafana",
      subject: "feat(registry): add grafana/grafana",
      file: "registry/bricks/grafana/grafana.json",
    },
  ];

  it("opens a pull request only for branches that have none, against the base branch", () => {
    const ops = planPulls(repo, branches, ["brick/vitejs-vite"], "main");
    expect(ops).toHaveLength(1);
    expect(ops[0]?.body).toMatchObject({
      title: "feat(registry): add grafana/grafana",
      head: "brick/grafana-grafana",
      base: "main",
    });
  });

  it("explains itself, links by absolute URL and does not ask for lazy reviews", () => {
    const body = poolBody(repo, "registry/bricks/a/b.json");
    expect(body).toContain(
      "https://github.com/kush07upadhyay/GitPyramid/blob/main/GOVERNANCE.md#the-review-rule-4-for-1",
    );
    expect(body).toContain("registry/bricks/a/b.json");
    expect(body).toContain('"Looks good" does not count');
    expect(body).not.toMatch(/[\u2013\u2014]/);
  });
});

describe("localPoolBranches", () => {
  let dir: string;
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.dev", ...args], {
      cwd: dir,
      encoding: "utf8",
    });
  const write = (path: string, text: string) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  };
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gp-pool-"));
    git("init", "-q", "-b", "main");
    write("README.md", "x");
    git("add", "-A");
    git("commit", "-q", "-m", "init");
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("finds branches that add exactly one manifest, and nothing else", () => {
    git("checkout", "-q", "-b", "brick/a-b");
    write("registry/bricks/a/b.json", "{}");
    git("add", "-A");
    git("commit", "-q", "-m", "feat(registry): add a/b");
    git("checkout", "-q", "main");
    git("checkout", "-q", "-b", "brick/mixed");
    write("registry/bricks/c/d.json", "{}");
    write("README.md", "changed");
    git("add", "-A");
    git("commit", "-q", "-m", "feat: mixed");
    git("checkout", "-q", "main");
    git("checkout", "-q", "-b", "feat/not-a-brick");
    write("registry/bricks/e/f.json", "{}");
    git("add", "-A");
    git("commit", "-q", "-m", "feat: other");
    git("checkout", "-q", "main");

    expect(localPoolBranches("main", dir)).toEqual([
      { branch: "brick/a-b", subject: "feat(registry): add a/b", file: "registry/bricks/a/b.json" },
    ]);
  });

  it("returns nothing when there are no brick branches", () => {
    expect(localPoolBranches("main", dir)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
type Reply = { status?: number; body?: unknown };

function fakeHttp(replies: Record<string, Reply | Reply[]> = {}) {
  const calls: Array<{
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  }> = [];
  const counters = new Map<string, number>();
  const http: Http = async (url, init) => {
    calls.push({
      method: init.method,
      url,
      headers: init.headers,
      ...(init.body !== undefined ? { body: init.body } : {}),
    });
    const key = `${init.method} ${url.replace(API, "")}`;
    const entry = replies[key] ?? (init.method === "GET" ? { body: [] } : { status: 204 });
    const reply = Array.isArray(entry)
      ? (entry[counters.get(key) ?? 0] ?? entry.at(-1) ?? {})
      : entry;
    counters.set(key, (counters.get(key) ?? 0) + 1);
    return {
      status: reply.status ?? 200,
      headers: { get: () => null },
      json: async () => reply.body ?? {},
    } as HttpResponse;
  };
  return { http, calls };
}

const noSleep = async () => {};

describe("GitHubApi", () => {
  it("sends the token only to api.github.com, and only when there is one", async () => {
    const { http, calls } = fakeHttp();
    await new GitHubApi(http, "secret", noSleep).get("/repos/a/b/labels");
    await new GitHubApi(http, undefined, noSleep).get("/repos/a/b/labels");
    expect(calls[0]?.url.startsWith("https://api.github.com/")).toBe(true);
    expect(calls[0]?.headers.Authorization).toBe("Bearer secret");
    expect(calls[1]?.headers.Authorization).toBeUndefined();
    expect(calls[0]?.headers["X-GitHub-Api-Version"]).toBe("2022-11-28");
  });

  it("reads every page of a list and stops on a short page", async () => {
    const full = Array.from({ length: 100 }, (_, i) => ({ i }));
    const { http, calls } = fakeHttp({
      "GET /repos/a/b/labels?per_page=100&page=1": { body: full },
      "GET /repos/a/b/labels?per_page=100&page=2": { body: [{ i: 100 }] },
    });
    const all = await new GitHubApi(http, "t", noSleep).list("/repos/a/b/labels");
    expect(all).toHaveLength(101);
    expect(calls).toHaveLength(2);
  });

  it("adds paging after an existing query string", async () => {
    const { http, calls } = fakeHttp();
    await new GitHubApi(http, "t", noSleep).list("/repos/a/b/issues?state=all");
    expect(calls[0]?.url).toBe(
      "https://api.github.com/repos/a/b/issues?state=all&per_page=100&page=1",
    );
  });

  it("stops at a page limit instead of looping forever", async () => {
    const full = Array.from({ length: 100 }, () => ({}));
    const { http, calls } = fakeHttp({
      "GET /x?per_page=100&page=1": { body: full },
      "GET /x?per_page=100&page=2": { body: full },
    });
    await new GitHubApi(http, "t", noSleep).list("/x", 2);
    expect(calls).toHaveLength(2);
  });

  it("sends a JSON body with its content type, and no body or type when there is none", async () => {
    const { http, calls } = fakeHttp();
    const api = new GitHubApi(http, "t", noSleep);
    await api.send({ step: "labels", summary: "s", method: "POST", path: "/p", body: { a: 1 } });
    await api.send({ step: "security", summary: "s", method: "PUT", path: "/q" });
    expect(calls[0]?.body).toBe('{"a":1}');
    expect(calls[0]?.headers["Content-Type"]).toBe("application/json");
    expect(calls[1]?.body).toBeUndefined();
    expect(calls[1]?.headers["Content-Type"]).toBeUndefined();
  });

  it("pauses a second after each write, but not after a failure", async () => {
    const sleep = vi.fn(async () => {});
    const { http } = fakeHttp({
      "POST /bad": { status: 422, body: { message: "Validation Failed" } },
    });
    const api = new GitHubApi(http, "t", sleep);
    await api.send({ step: "labels", summary: "s", method: "POST", path: "/ok" });
    expect(sleep).toHaveBeenCalledWith(1000);
    sleep.mockClear();
    await expect(
      api.send({ step: "labels", summary: "s", method: "POST", path: "/bad" }),
    ).rejects.toThrow();
    expect(sleep).not.toHaveBeenCalled();
  });

  it.each([
    [401, "token is missing or not valid"],
    [403, "lack a permission"],
    [404, "not found"],
  ])("explains a %s", async (status, hint) => {
    const { http } = fakeHttp({ "GET /x": { status, body: { message: "Nope" } } });
    await expect(new GitHubApi(http, "t", noSleep).get("/x")).rejects.toThrow(hint);
  });

  it("includes the detail GitHub gives for a validation error", async () => {
    const { http } = fakeHttp({
      "POST /x": {
        status: 422,
        body: { message: "Validation Failed", errors: [{ field: "name" }] },
      },
    });
    await expect(
      new GitHubApi(http, "t", noSleep).send({
        step: "labels",
        summary: "s",
        method: "POST",
        path: "/x",
      }),
    ).rejects.toThrow('Validation Failed [{"field":"name"}]');
  });

  it("copes with an error body that is not JSON", async () => {
    const http: Http = async () => ({
      status: 500,
      headers: { get: () => null },
      json: async () => {
        throw new Error("no");
      },
    });
    await expect(new GitHubApi(http, "t", noSleep).get("/x")).rejects.toThrow("failed with 500");
  });
});

// ---------------------------------------------------------------------------------------------
describe("runSetup", () => {
  const sources = () => ({
    labelsYaml: read(".github/labels.yml"),
    seedIssuesMarkdown: read("docs/launch/seed-issues.md"),
    poolBranches: [] as Array<{ branch: string; subject: string; file: string }>,
  });
  const options = (over: Partial<Options> = {}): Options => ({
    apply: false,
    repo,
    baseBranch: "main",
    steps: STEPS,
    pruneDefaultLabels: false,
    ...over,
  });
  const writes = (calls: Array<{ method: string }>) => calls.filter((c) => c.method !== "GET");

  it("changes nothing in a dry run, only reads", async () => {
    const { http, calls } = fakeHttp();
    const report = await runSetup(new GitHubApi(http, "t", noSleep), options(), sources());
    expect(writes(calls)).toEqual([]);
    expect(report.applied).toBe(0);
    expect(report.planned.length).toBeGreaterThan(20);
    expect(report.failures).toEqual([]);
  });

  it("plans a full fresh setup: every label, every seed issue, the ruleset", async () => {
    const { http } = fakeHttp();
    const report = await runSetup(new GitHubApi(http, "t", noSleep), options(), sources());
    const count = (step: string) => report.planned.filter((o) => o.step === step).length;
    expect(count("labels")).toBe(24);
    expect(count("issues")).toBe(parseSeedIssues(read("docs/launch/seed-issues.md")).length);
    expect(count("ruleset")).toBe(1);
    expect(count("settings")).toBe(1);
    expect(count("security")).toBe(3);
    expect(count("actions")).toBe(2);
  });

  it("applies in the documented order, with the ruleset last", async () => {
    const { http } = fakeHttp();
    const report = await runSetup(
      new GitHubApi(http, "t", noSleep),
      options({ apply: true }),
      sources(),
    );
    expect(report.applied).toBe(report.planned.length);
    const order = report.planned.map((o) => o.step);
    const firstIndex = (s: string) => order.indexOf(s as never);
    expect(firstIndex("labels")).toBeLessThan(firstIndex("issues"));
    expect(order.at(-1)).toBe("ruleset");
  });

  it("is idempotent: nothing to do when everything already exists", async () => {
    const issues = parseSeedIssues(read("docs/launch/seed-issues.md")).map((i) => ({
      title: i.title,
    }));
    const labels = parseLabels(read(".github/labels.yml")).map((l) => ({ ...l }));
    const { http } = fakeHttp({
      "GET /repos/kush07upadhyay/GitPyramid/labels?per_page=100&page=1": { body: labels },
      "GET /repos/kush07upadhyay/GitPyramid/issues?state=all&per_page=100&page=1": { body: issues },
      "GET /repos/kush07upadhyay/GitPyramid/rulesets?per_page=100&page=1": {
        body: [{ id: 9, name: "Protect main" }],
      },
      "GET /repos/kush07upadhyay/GitPyramid/rulesets/9": {
        body: { id: 9, name: "Protect main", bypass_actors: [] },
      },
    });
    const report = await runSetup(
      new GitHubApi(http, "t", noSleep),
      options({ steps: ["labels", "issues"] }),
      sources(),
    );
    expect(report.planned).toEqual([]);
  });

  it("does not count pull requests as issues when checking for existing titles", async () => {
    const first = parseSeedIssues(read("docs/launch/seed-issues.md"))[0] as { title: string };
    const { http } = fakeHttp({
      "GET /repos/kush07upadhyay/GitPyramid/issues?state=all&per_page=100&page=1": {
        body: [{ title: first.title, pull_request: {} }],
      },
    });
    const report = await runSetup(
      new GitHubApi(http, "t", noSleep),
      options({ steps: ["issues"] }),
      sources(),
    );
    expect(report.planned.map((o) => o.summary)).toContain(`open issue "${first.title}"`);
  });

  it("keeps going after one change fails, and reports it", async () => {
    const { http } = fakeHttp({
      "PUT /repos/kush07upadhyay/GitPyramid/topics": {
        status: 403,
        body: { message: "Forbidden" },
      },
    });
    const report = await runSetup(
      new GitHubApi(http, "t", noSleep),
      options({ apply: true, steps: ["topics", "security"] }),
      sources(),
    );
    expect(report.applied).toBe(3);
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0]).toContain("set 8 topics");
  });

  it("stops a step when it cannot read what exists while applying, instead of guessing", async () => {
    const { http } = fakeHttp({
      "GET /repos/kush07upadhyay/GitPyramid/labels?per_page=100&page=1": {
        status: 401,
        body: { message: "Bad credentials" },
      },
    });
    const report = await runSetup(
      new GitHubApi(http, "t", noSleep),
      options({ apply: true, steps: ["labels", "topics"] }),
      sources(),
    );
    expect(report.failures[0]).toContain("planning labels");
    expect(report.planned.filter((o) => o.step === "labels")).toEqual([]);
    expect(report.applied).toBe(1);
  });

  it("still shows a plan in a dry run when GitHub cannot be read, and says so", async () => {
    const { http } = fakeHttp({
      "GET /repos/kush07upadhyay/GitPyramid/labels?per_page=100&page=1": {
        status: 404,
        body: { message: "Not Found" },
      },
    });
    const report = await runSetup(
      new GitHubApi(http, undefined, noSleep),
      options({ steps: ["labels"] }),
      sources(),
    );
    expect(report.planned).toHaveLength(24);
    expect(report.notes.join(" ")).toContain("Could not read the labels");
    expect(report.failures).toEqual([]);
  });

  it("limits itself to the steps it is given", async () => {
    const { http } = fakeHttp();
    const report = await runSetup(
      new GitHubApi(http, "t", noSleep),
      options({ steps: ["topics"] }),
      sources(),
    );
    expect(new Set(report.planned.map((o) => o.step))).toEqual(new Set(["topics"]));
  });

  it("always reminds about the two things only a person can do", async () => {
    const { http } = fakeHttp();
    const report = await runSetup(
      new GitHubApi(http, "t", noSleep),
      options({ steps: ["topics"] }),
      sources(),
    );
    expect(report.notes.join(" ")).toContain("Discussions");
    expect(report.notes.join(" ")).toContain("social preview");
  });

  describe("review pool", () => {
    const pool = [
      { branch: "brick/a-b", subject: "feat(registry): add a/b", file: "registry/bricks/a/b.json" },
    ];

    it("says so when there are no local brick branches", async () => {
      const { http } = fakeHttp();
      const report = await runSetup(
        new GitHubApi(http, "t", noSleep),
        options({ steps: ["pulls"] }),
        sources(),
      );
      expect(report.planned).toEqual([]);
      expect(report.notes.join(" ")).toContain("No local brick/* branches");
    });

    it("asks for the branches to be pushed first, and opens nothing for them", async () => {
      const { http } = fakeHttp({
        "GET /repos/kush07upadhyay/GitPyramid/branches?per_page=100&page=1": {
          body: [{ name: "main" }],
        },
      });
      const report = await runSetup(
        new GitHubApi(http, "t", noSleep),
        options({ steps: ["pulls"] }),
        { ...sources(), poolBranches: pool },
      );
      expect(report.planned).toEqual([]);
      expect(report.notes.join(" ")).toContain(
        "Push these branches first: brick/a-b".replace("first:", "first, then run again:"),
      );
    });

    it("opens a pull request for a pushed branch with none open", async () => {
      const { http } = fakeHttp({
        "GET /repos/kush07upadhyay/GitPyramid/branches?per_page=100&page=1": {
          body: [{ name: "main" }, { name: "brick/a-b" }],
        },
        "GET /repos/kush07upadhyay/GitPyramid/pulls?state=open&per_page=100&page=1": { body: [] },
      });
      const report = await runSetup(
        new GitHubApi(http, "t", noSleep),
        options({ steps: ["pulls"] }),
        { ...sources(), poolBranches: pool },
      );
      expect(report.planned).toHaveLength(1);
      expect(report.planned[0]).toMatchObject({
        method: "POST",
        path: "/repos/kush07upadhyay/GitPyramid/pulls",
      });
    });

    it("does not open a second pull request for a branch that already has one", async () => {
      const { http } = fakeHttp({
        "GET /repos/kush07upadhyay/GitPyramid/branches?per_page=100&page=1": {
          body: [{ name: "brick/a-b" }],
        },
        "GET /repos/kush07upadhyay/GitPyramid/pulls?state=open&per_page=100&page=1": {
          body: [{ head: { ref: "brick/a-b" } }],
        },
      });
      const report = await runSetup(
        new GitHubApi(http, "t", noSleep),
        options({ steps: ["pulls"] }),
        { ...sources(), poolBranches: pool },
      );
      expect(report.planned).toEqual([]);
    });
  });

  it("fetches the full ruleset to keep a hand-made bypass, because the list leaves it out", async () => {
    const bypass = [{ actor_id: 5, actor_type: "RepositoryRole", bypass_mode: "pull_request" }];
    const { http } = fakeHttp({
      "GET /repos/kush07upadhyay/GitPyramid/rulesets?per_page=100&page=1": {
        body: [{ id: 9, name: "Protect main" }],
      },
      "GET /repos/kush07upadhyay/GitPyramid/rulesets/9": {
        body: { id: 9, name: "Protect main", bypass_actors: bypass },
      },
    });
    const report = await runSetup(
      new GitHubApi(http, "t", noSleep),
      options({ steps: ["ruleset"] }),
      sources(),
    );
    expect(report.planned[0]?.body).toHaveProperty("bypass_actors", bypass);
  });
});

// ---------------------------------------------------------------------------------------------
describe("selectSteps", () => {
  it("defaults to every step, in order", () => {
    expect(selectSteps()).toEqual([...STEPS]);
  });

  it("honors --only and --skip, and keeps the safe order whatever order they are written in", () => {
    expect(selectSteps("ruleset,labels")).toEqual(["labels", "ruleset"]);
    expect(selectSteps(undefined, "ruleset,pulls")).toEqual(
      STEPS.filter((s) => s !== "ruleset" && s !== "pulls"),
    );
    expect(selectSteps("labels,issues", "issues")).toEqual(["labels"]);
  });

  it("rejects an unknown step and lists the real ones", () => {
    expect(() => selectSteps("labels,nope")).toThrow('Unknown step "nope"');
    expect(() => selectSteps(undefined, "wat")).toThrow(STEPS.join(", "));
  });
});

describe("command line", () => {
  beforeEach(() => {
    vi.stubEnv("GITHUB_TOKEN", "");
    vi.stubEnv("GH_TOKEN", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("refuses --apply without a token and tells the user never to paste it anywhere", async () => {
    const errors: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...a) => void errors.push(a.join(" ")));
    expect(await main(["--apply", "--repo", "a/b"])).toBe(2);
    expect(errors.join(" ")).toContain("Never paste a token");
  });

  it.each([
    [["--wat"], "Unknown option"],
    [["stray"], "Unexpected argument"],
    [["--repo"], "needs a value"],
    [["--only", "--apply"], "needs a value"],
  ])("rejects bad arguments %j", async (argv, message) => {
    await expect(main(argv)).rejects.toThrow(message);
  });
});

describe("operations are plain data", () => {
  it("every planned operation uses an API path and a known method", async () => {
    const { http } = fakeHttp();
    const sources = {
      labelsYaml: read(".github/labels.yml"),
      seedIssuesMarkdown: read("docs/launch/seed-issues.md"),
      poolBranches: [],
    };
    const report = await runSetup(
      new GitHubApi(http, "t", noSleep),
      { apply: false, repo, baseBranch: "main", steps: STEPS, pruneDefaultLabels: true },
      sources,
    );
    const ops: Operation[] = report.planned;
    for (const op of ops) {
      expect(op.path.startsWith("/repos/kush07upadhyay/GitPyramid")).toBe(true);
      expect(["POST", "PUT", "PATCH", "DELETE"]).toContain(op.method);
      expect(() => JSON.stringify(op.body)).not.toThrow();
    }
  });
});
