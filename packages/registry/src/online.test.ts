import { describe, expect, it } from "vitest";
import { checkOnline, type Fetcher, type HttpResponseLike } from "./online";
import type { LedgerEntry } from "./schema";
import type { ValidatedBrick } from "./types";

const NOW = new Date("2026-11-01T00:00:00Z");

function validated(full: string): ValidatedBrick {
  const [owner, repo] = full.split("/") as [string, string];
  return {
    path: `bricks/${full}.json`,
    file: `registry/bricks/${full}.json`,
    owner,
    repo,
    full,
    brick: {
      schemaVersion: 1,
      repo: full,
      name: repo,
      sector: "backend",
      category: "web-frameworks",
      problemSolved: "Builds typed, fast web APIs in Python with automatic docs.",
      techStack: ["python"],
      license: "MIT",
    },
  };
}

function response(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): HttpResponseLike {
  return {
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  };
}

const healthy = (over: Record<string, unknown> = {}) => ({
  id: 1,
  full_name: "fastapi/fastapi",
  private: false,
  archived: false,
  disabled: false,
  fork: false,
  is_template: false,
  stargazers_count: 5000,
  pushed_at: "2026-10-30T00:00:00Z",
  created_at: "2018-12-08T00:00:00Z",
  license: { spdx_id: "MIT" },
  ...over,
});

function fake(routes: Record<string, () => HttpResponseLike | Promise<HttpResponseLike>>) {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const fetcher: Fetcher = async (url, init) => {
    calls.push({ url, headers: init.headers });
    const route = routes[url.replace("https://api.github.com/repos/", "")];
    if (!route) throw new Error(`unexpected ${url}`);
    return route();
  };
  return { fetcher, calls };
}

const ledger: LedgerEntry[] = [];
const run = (
  bricks: ValidatedBrick[],
  routes: Parameters<typeof fake>[0],
  extra = {},
  led = ledger,
) => {
  const { fetcher, calls } = fake(routes);
  return checkOnline(bricks, led, { fetcher, now: NOW, ...extra }).then((issues) => ({
    issues,
    calls,
  }));
};
const codes = (issues: { severity: string; code: string }[]) =>
  issues.map((i) => `${i.severity}:${i.code}`);

describe("checkOnline", () => {
  const brick = validated("fastapi/fastapi");

  it("is quiet for a healthy repository", async () => {
    const { issues } = await run([brick], { "fastapi/fastapi": () => response(200, healthy()) });
    expect(issues).toEqual([]);
  });

  it("only talks to api.github.com and sends the token only there", async () => {
    const { calls } = await run(
      [brick],
      { "fastapi/fastapi": () => response(200, healthy()) },
      { token: "secret" },
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url.startsWith("https://api.github.com/repos/")).toBe(true);
    expect(calls[0]?.headers.Authorization).toBe("Bearer secret");
    expect(calls[0]?.headers["User-Agent"]).toBeTruthy();
  });

  it("sends no Authorization header without a token", async () => {
    const { calls } = await run([brick], { "fastapi/fastapi": () => response(200, healthy()) });
    expect(calls[0]?.headers.Authorization).toBeUndefined();
  });

  it("reports a missing repository", async () => {
    const { issues } = await run([brick], { "fastapi/fastapi": () => response(404, {}) });
    expect(codes(issues)).toEqual(["error:REPO_NOT_FOUND"]);
  });

  it("reports a renamed repository and gives the new path", async () => {
    const react = validated("facebook/react");
    const { issues } = await run([react], {
      "facebook/react": () => response(200, healthy({ full_name: "react/react", id: 10270250 })),
    });
    const issue = issues.find((i) => i.code === "RENAMED");
    expect(issue?.message).toContain("registry/bricks/react/react.json");
  });

  it("catches a repository name that was taken over by a different repository", async () => {
    const admitted: LedgerEntry[] = [
      { id: 1, repo: "fastapi/fastapi", githubId: 111, admitted: "2026-11-01", impact: 4 },
    ];
    const { issues } = await run(
      [brick],
      { "fastapi/fastapi": () => response(200, healthy({ id: 999 })) },
      {},
      admitted,
    );
    expect(codes(issues)).toEqual(["error:REPO_ID_CHANGED"]);
    expect(issues[0]?.message).toContain("taken over");
  });

  it("accepts the same GitHub id", async () => {
    const admitted: LedgerEntry[] = [
      { id: 1, repo: "fastapi/fastapi", githubId: 111, admitted: "2026-11-01", impact: 4 },
    ];
    const { issues } = await run(
      [brick],
      { "fastapi/fastapi": () => response(200, healthy({ id: 111 })) },
      {},
      admitted,
    );
    expect(issues).toEqual([]);
  });

  it.each([
    ["archived", { archived: true }, "error:ARCHIVED"],
    ["private", { private: true }, "error:PRIVATE"],
    ["disabled", { disabled: true }, "error:DISABLED"],
    ["a fork", { fork: true }, "warning:FORK"],
    ["a template", { is_template: true }, "warning:TEMPLATE"],
    ["idle for over a year", { pushed_at: "2025-01-01T00:00:00Z" }, "warning:WEATHERED"],
    ["brand new", { created_at: "2026-10-25T00:00:00Z" }, "warning:NEW_REPO"],
    ["low on stars", { stargazers_count: 12 }, "warning:LOW_SIGNAL"],
  ])("flags a repository that is %s", async (_name, over, expected) => {
    const { issues } = await run([brick], {
      "fastapi/fastapi": () => response(200, healthy(over)),
    });
    expect(codes(issues)).toContain(expected);
  });

  it("does not call a repository weathered at exactly 365 days", async () => {
    const pushed = new Date(NOW.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const { issues } = await run([brick], {
      "fastapi/fastapi": () => response(200, healthy({ pushed_at: pushed })),
    });
    expect(codes(issues)).not.toContain("warning:WEATHERED");
  });

  it("reports a license mismatch with both values", async () => {
    const { issues } = await run([brick], {
      "fastapi/fastapi": () => response(200, healthy({ license: { spdx_id: "Apache-2.0" } })),
    });
    expect(issues[0]?.code).toBe("LICENSE_MISMATCH");
    expect(issues[0]?.message).toContain("Apache-2.0");
  });

  it("only warns when GitHub cannot detect the license, like the Linux kernel", async () => {
    const linux = validated("torvalds/linux");
    linux.brick.license = "GPL-2.0-only WITH Linux-syscall-note";
    const { issues } = await run([linux], {
      "torvalds/linux": () =>
        response(
          200,
          healthy({ full_name: "torvalds/linux", license: { spdx_id: "NOASSERTION" } }),
        ),
    });
    expect(codes(issues)).toEqual(["warning:LICENSE_UNVERIFIED"]);
  });

  it("treats a missing license object as unverifiable", async () => {
    const { issues } = await run([brick], {
      "fastapi/fastapi": () => response(200, healthy({ license: null })),
    });
    expect(codes(issues)).toEqual(["warning:LICENSE_UNVERIFIED"]);
  });

  it("matches deprecated GNU ids reported by GitHub", async () => {
    const gpl = validated("a/gpl");
    gpl.brick.license = "GPL-2.0-only";
    const { issues } = await run([gpl], {
      "a/gpl": () =>
        response(200, healthy({ full_name: "a/gpl", license: { spdx_id: "GPL-2.0" } })),
    });
    expect(issues).toEqual([]);
  });

  it("stops and warns once when rate limited", async () => {
    const bricks = ["a/one", "b/two", "c/three"].map(validated);
    const { issues, calls } = await run(bricks, {
      "a/one": () => response(200, healthy({ full_name: "a/one" })),
      "b/two": () => response(403, {}, { "x-ratelimit-remaining": "0" }),
      "c/three": () => response(200, healthy({ full_name: "c/three" })),
    });
    expect(calls).toHaveLength(2);
    expect(codes(issues)).toEqual(["warning:ONLINE_RATE_LIMITED"]);
  });

  it("treats a 429 as rate limiting", async () => {
    const { issues } = await run([brick], { "fastapi/fastapi": () => response(429, {}) });
    expect(codes(issues)).toEqual(["warning:ONLINE_RATE_LIMITED"]);
  });

  it("treats other 403 answers as an unavailable repository", async () => {
    const { issues } = await run([brick], { "fastapi/fastapi": () => response(403, {}) });
    expect(codes(issues)).toEqual(["error:REPO_UNAVAILABLE"]);
  });

  it("never turns a network failure or server error into an error", async () => {
    const a = await run([brick], {
      "fastapi/fastapi": () => {
        throw new Error("offline");
      },
    });
    expect(codes(a.issues)).toEqual(["warning:ONLINE_UNAVAILABLE"]);
    const b = await run([brick], { "fastapi/fastapi": () => response(503, {}) });
    expect(codes(b.issues)).toEqual(["warning:ONLINE_UNAVAILABLE"]);
  });

  it("warns, not fails, on an answer in an unexpected shape", async () => {
    const { issues } = await run([brick], {
      "fastapi/fastapi": () => response(200, { hello: "world" }),
    });
    expect(codes(issues)).toEqual(["warning:ONLINE_UNEXPECTED"]);
  });

  it("respects the request limit and says how many were skipped", async () => {
    const names = ["a/one", "b/two", "c/three"];
    const routes = Object.fromEntries(
      names.map((n) => [n, () => response(200, healthy({ full_name: n }))]),
    );
    const { issues, calls } = await run(names.map(validated), routes, { maxRequests: 2 });
    expect(calls).toHaveLength(2);
    expect(issues.find((i) => i.code === "ONLINE_LIMIT")?.message).toContain("1 repositories");
  });

  it("gives up on a request that never answers", async () => {
    const fetcher: Fetcher = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    const issues = await checkOnline([brick], ledger, { fetcher, now: NOW, timeoutMs: 20 });
    expect(codes(issues)).toEqual(["warning:ONLINE_UNAVAILABLE"]);
  });

  it("gives up when the body stalls after the headers arrive", async () => {
    const fetcher: Fetcher = async (_url, init) => ({
      status: 200,
      headers: { get: () => null },
      json: () =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    });
    const issues = await checkOnline([brick], ledger, { fetcher, now: NOW, timeoutMs: 20 });
    expect(codes(issues)).toEqual(["warning:ONLINE_UNAVAILABLE"]);
  });
});
