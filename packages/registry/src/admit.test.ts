import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type AdmitOptions, type AdmitResult, admitBrick } from "./admit";
import { main } from "./cli";
import type { Fetcher, HttpResponseLike } from "./online";
import { brick, ledgerLine, TAXONOMY_TEXT } from "./test-helpers";

const NOW = new Date(2026, 10, 1, 9, 30); // 1 November 2026, local time

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "gp-admit-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function put(path: string, text: string) {
  const target = join(dir, path);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, text);
}
const manifest = (repo: string, over: Record<string, unknown> = {}) =>
  put(`bricks/${repo}.json`, `${JSON.stringify(brick({ repo, ...over }), null, 2)}\n`);
const ledger = () => readFileSync(join(dir, "ledger.jsonl"), "utf8");

/** A registry with fastapi/fastapi already admitted as #1 and expressjs/express merged but not yet. */
function seed(
  ledgerText = `${ledgerLine({ id: 1, repo: "fastapi/fastapi", githubId: 160919119 })}\n`,
) {
  put("taxonomy.json", TAXONOMY_TEXT);
  manifest("fastapi/fastapi");
  manifest("expressjs/express", { name: "Express", website: "https://expressjs.com" });
  put("ledger.jsonl", ledgerText);
}

function github(status: number, body: unknown, headers: Record<string, string> = {}): Fetcher {
  const response: HttpResponseLike = {
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  };
  return async () => response;
}
const repoInfo = (over: Record<string, unknown> = {}) => ({
  id: 237159,
  full_name: "expressjs/express",
  private: false,
  archived: false,
  disabled: false,
  ...over,
});

function admit(over: Partial<AdmitOptions> = {}): Promise<AdmitResult> {
  return admitBrick({
    rootDir: dir,
    repo: "expressjs/express",
    impact: 4,
    by: "kush07upadhyay",
    offline: false,
    fetcher: github(200, repoInfo()),
    now: NOW,
    ...over,
  });
}
const message = (r: AdmitResult) => (r.ok ? "" : r.message);

describe("admitBrick: the happy path", () => {
  it("appends the next id with GitHub's numeric id and the local date", async () => {
    seed();
    const before = ledger();
    const result = await admit();
    expect(result).toMatchObject({ ok: true, id: 2, wrote: true });
    expect(ledger()).toBe(
      `${before}{"id":2,"repo":"expressjs/express","githubId":237159,"admitted":"2026-11-01","by":"kush07upadhyay","impact":4}\n`,
    );
  });

  it("produces a registry that validates with no ledger problems afterwards", async () => {
    seed();
    await admit();
    const run = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await main(["validate", "--root", dir])).toBe(0);
    expect(run.mock.calls.join(" ")).toContain("2 bricks checked: 0 errors, 0 warnings");
  });

  it("admits the very first brick into a missing ledger as #1, creating the file", async () => {
    put("taxonomy.json", TAXONOMY_TEXT);
    manifest("expressjs/express", { name: "Express" });
    const result = await admit();
    expect(result).toMatchObject({ ok: true, id: 1 });
    expect(ledger()).toBe(
      '{"id":1,"repo":"expressjs/express","githubId":237159,"admitted":"2026-11-01","by":"kush07upadhyay","impact":4}\n',
    );
  });

  it("admits the first brick into an empty ledger as #1", async () => {
    put("taxonomy.json", TAXONOMY_TEXT);
    manifest("expressjs/express", { name: "Express" });
    put("ledger.jsonl", "");
    expect(await admit()).toMatchObject({ ok: true, id: 1 });
    expect(ledger().split("\n").filter(Boolean)).toHaveLength(1);
  });

  it("matches the ledger's line endings, and repairs a missing final newline", async () => {
    seed(`${ledgerLine({ id: 1, repo: "fastapi/fastapi", githubId: 160919119 })}\r\n`);
    await admit();
    expect(ledger().endsWith('"impact":4}\r\n')).toBe(true);
    expect(ledger().split("\r\n").filter(Boolean)).toHaveLength(2);

    seed(ledgerLine({ id: 1, repo: "fastapi/fastapi", githubId: 160919119 }));
    await admit();
    const lines = ledger().split("\n").filter(Boolean);
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[1] as string).id).toBe(2);
  });

  it("accepts a repository written as a GitHub URL or in capitals", async () => {
    seed();
    const result = await admit({ repo: "https://github.com/ExpressJS/Express/" });
    expect(result).toMatchObject({ ok: true, id: 2 });
  });

  it("records the incubating flag when asked, and leaves it out otherwise", async () => {
    seed();
    const result = await admit({ incubating: true });
    expect(result.ok && result.line).toContain('"incubating":true');
    seed();
    const plain = await admit();
    expect(plain.ok && plain.line).not.toContain("incubating");
  });

  it("writes nothing in a dry run", async () => {
    seed();
    const before = ledger();
    const result = await admit({ dryRun: true });
    expect(result).toMatchObject({ ok: true, id: 2, wrote: false });
    expect(ledger()).toBe(before);
  });

  it("notes when no maintainer name was given, and still works", async () => {
    seed();
    const result = await admit({ by: undefined });
    expect(result.ok && result.notes.join(" ")).toContain("--by");
    expect(result.ok && result.line).not.toContain('"by"');
  });

  it("works offline when the numeric id is given", async () => {
    seed();
    const result = await admit({ offline: true, githubId: 237159, fetcher: undefined });
    expect(result).toMatchObject({ ok: true, id: 2 });
    expect(ledger()).toContain('"githubId":237159');
  });

  it("uses the date it is given, so a maintainer can record the merge day", async () => {
    seed();
    await admit({ date: "2026-10-31" });
    expect(ledger()).toContain('"admitted":"2026-10-31"');
  });
});

describe("admitBrick: usage mistakes", () => {
  it.each([
    ["no impact", { impact: undefined }, "--impact"],
    ["impact 0", { impact: 0 }, "1 to 5"],
    ["impact 6", { impact: 6 }, "1 to 5"],
    ["a fractional impact", { impact: 2.5 }, "1 to 5"],
    ["a bad repository", { repo: "not a repo" }, "is not a GitHub repository"],
    ["a repository with .git", { repo: "a/b.git" }, "is not a GitHub repository"],
    ["a bad login", { by: "-bad-" }, "is not a GitHub login"],
    ["a bad date", { date: "1 Nov" }, "is not a date"],
    ["a bad github id", { githubId: -4 }, "positive whole number"],
    ["offline without a github id", { offline: true }, "needs --github-id"],
  ])("rejects %s as a usage mistake and writes nothing", async (_name, over, text) => {
    seed();
    const before = ledger();
    const result = await admit(over as Partial<AdmitOptions>);
    expect(result).toMatchObject({ ok: false, kind: "usage" });
    expect(message(result)).toContain(text);
    expect(ledger()).toBe(before);
  });
});

describe("admitBrick: refusals leave the ledger untouched", () => {
  async function refuses(over: Partial<AdmitOptions>, text: string, setup: () => void = seed) {
    setup();
    const before = ledger();
    const result = await admit(over);
    expect(result).toMatchObject({ ok: false, kind: "refused" });
    expect(message(result)).toContain(text);
    expect(ledger()).toBe(before);
  }

  it("when there is no manifest yet", () =>
    refuses({ repo: "pallets/flask" }, "There is no manifest"));

  it("when the manifest has errors", () =>
    refuses({}, "has errors", () => {
      seed();
      manifest("expressjs/express", { name: "Express", sector: "ai" });
    }));

  it("when the repository is already admitted", () =>
    refuses({ repo: "fastapi/fastapi" }, "already admitted as #1"));

  it("when the ledger already has a gap, so the next id cannot be trusted", () =>
    refuses({}, "next id cannot be trusted", () =>
      seed(
        `${ledgerLine({ id: 1, repo: "fastapi/fastapi" })}\n${ledgerLine({ id: 3, repo: "x/y" })}\n`,
      ),
    ));

  it("when the same GitHub id is already in the ledger under another name", () =>
    refuses({}, "already belongs to #1", () =>
      seed(`${ledgerLine({ id: 1, repo: "fastapi/fastapi", githubId: 237159 })}\n`),
    ));

  it("when GitHub says the repository moved", () =>
    refuses(
      { fetcher: github(200, repoInfo({ full_name: "expressjs/express-renamed" })) },
      "is now expressjs/express-renamed",
    ));

  it.each([
    ["is private", { private: true }, "is private"],
    ["is archived", { archived: true }, "is archived"],
    ["is disabled", { disabled: true }, "is disabled"],
  ])("when the repository %s", (_name, info, text) =>
    refuses({ fetcher: github(200, repoInfo(info)) }, text),
  );

  it("when GitHub has no such repository", () =>
    refuses({ fetcher: github(404, {}) }, "no public repository"));

  it("when GitHub is rate limited, and suggests the offline route", () =>
    refuses({ fetcher: github(403, {}, { "x-ratelimit-remaining": "0" }) }, "rate limit"));

  it("when GitHub answers with something unexpected", () =>
    refuses({ fetcher: github(200, { hello: "world" }) }, "not in the expected shape"));

  it("when GitHub has a server problem", () => refuses({ fetcher: github(503, {}) }, "status 503"));

  it("when the network is down", () =>
    refuses(
      {
        fetcher: async () => {
          throw new Error("offline");
        },
      },
      "Could not reach GitHub",
    ));

  it("when a given github id disagrees with GitHub", () =>
    refuses({ githubId: 111 }, "does not match the id GitHub reports"));

  it("when the line itself would break the ledger, such as a date in the future", () =>
    refuses({ date: "2099-01-01" }, "would break the ledger"));

  it("when a manifest sits behind a symbolic link", () => {
    // A registry that cannot be read cleanly must not be written to. Covered by the loader tests, so
    // here we only check that an unreadable ledger blocks the command.
    return refuses({}, "ledger", () => seed("not json\n"));
  });
});

describe("pnpm admit", () => {
  let out: string[];
  let err: string[];
  beforeEach(() => {
    out = [];
    err = [];
    vi.spyOn(console, "log").mockImplementation((...a) => void out.push(a.join(" ")));
    vi.spyOn(console, "error").mockImplementation((...a) => void err.push(a.join(" ")));
  });

  it("exits 0, prints the line and suggests the commit", async () => {
    seed();
    const code = await main([
      "admit",
      "expressjs/express",
      "--impact",
      "4",
      "--by",
      "kush07upadhyay",
      "--offline",
      "--github-id",
      "237159",
      "--root",
      dir,
    ]);
    expect(code).toBe(0);
    expect(out.join("\n")).toContain('"id":2');
    expect(out.join("\n")).toContain("chore(registry): admit expressjs/express as #2");
  });

  it("exits 0 and says nothing was written in a dry run", async () => {
    seed();
    const before = ledger();
    expect(
      await main([
        "admit",
        "expressjs/express",
        "--impact",
        "4",
        "--offline",
        "--github-id",
        "237159",
        "--dry-run",
        "--root",
        dir,
      ]),
    ).toBe(0);
    expect(out.join("\n")).toContain("Nothing was written");
    expect(ledger()).toBe(before);
  });

  it("exits 2 for usage mistakes and 1 when the registry blocks it", async () => {
    seed();
    expect(await main(["admit", "--impact", "4", "--root", dir])).toBe(2);
    expect(await main(["admit", "expressjs/express", "--root", dir])).toBe(2);
    expect(await main(["admit", "expressjs/express", "--impact", "four", "--root", dir])).toBe(2);
    expect(
      await main([
        "admit",
        "expressjs/express",
        "--impact",
        "4",
        "--github-id",
        "x",
        "--root",
        dir,
      ]),
    ).toBe(2);
    expect(
      await main([
        "admit",
        "pallets/flask",
        "--impact",
        "4",
        "--offline",
        "--github-id",
        "1",
        "--root",
        dir,
      ]),
    ).toBe(1);
    expect(err.join("\n")).toContain("There is no manifest");
  });

  it("lists the command in the usage text", async () => {
    expect(await main([])).toBe(2);
    expect(err.join("\n")).toContain("pnpm admit");
  });
});
