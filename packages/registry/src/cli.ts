import { appendFileSync, existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { admitBrick } from "./admit";
import { countIssues, formatGitHub, formatSummaryMarkdown, formatText } from "./format";
import { changedBrickFiles } from "./git";
import { loadRegistry } from "./loader";
import { checkOnline } from "./online";
import { scaffoldBrick } from "./scaffold";
import { type Issue, issueSort } from "./types";
import { validateRegistry } from "./validate";

const USAGE = `Usage:
  pnpm validate [--online] [--changed-since <ref>] [--format text|github] [--require-ledger] [--root <dir>]
  pnpm brick:new <owner/repo> --sector <sector> [--category <category>] [--offline]
  pnpm admit <owner/repo> --impact <1-5> [--by <login>] [--date YYYY-MM-DD] [--dry-run]
        [--github-id <id> --offline] [--incubating] [--root <dir>]

Exit codes: 0 ok (warnings allowed), 1 the registry has errors or blocks the change, 2 bad usage.`;

interface Parsed {
  command: string | undefined;
  positional: string[];
  flags: Map<string, string | true>;
}

const VALUE_FLAGS = new Set([
  "format",
  "root",
  "changed-since",
  "sector",
  "category",
  "impact",
  "by",
  "date",
  "github-id",
]);

function parseArgs(argv: string[]): Parsed {
  const [command, ...rest] = argv;
  const positional: string[] = [];
  const flags = new Map<string, string | true>();
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i] as string;
    if (arg.startsWith("--")) {
      const name = arg.slice(2);
      if (VALUE_FLAGS.has(name)) {
        const value = rest[i + 1];
        if (value === undefined || value.startsWith("--"))
          throw new Error(`--${name} needs a value.`);
        flags.set(name, value);
        i++;
      } else {
        flags.set(name, true);
      }
    } else {
      positional.push(arg);
    }
  }
  return { command, positional, flags };
}

function flag(parsed: Parsed, name: string): string | undefined {
  const value = parsed.flags.get(name);
  return typeof value === "string" ? value : undefined;
}

async function runValidate(parsed: Parsed): Promise<number> {
  const cwd = process.cwd();
  const rootDir = resolve(cwd, flag(parsed, "root") ?? "registry");
  if (!existsSync(rootDir)) {
    console.error(
      `The registry folder ${rootDir} does not exist. Run this from the repository root.`,
    );
    return 2;
  }
  const label = relative(cwd, rootDir).split("\\").join("/") || "registry";
  const format = flag(parsed, "format") ?? "text";
  if (format !== "text" && format !== "github") {
    console.error(`Unknown --format "${format}". Use text or github.`);
    return 2;
  }

  const loaded = loadRegistry(rootDir, label);
  const result = validateRegistry(loaded.snapshot, {
    rootLabel: label,
    requireLedger: parsed.flags.has("require-ledger"),
    today: new Date().toISOString().slice(0, 10),
  });
  const issues: Issue[] = [...loaded.issues, ...result.issues];

  if (parsed.flags.has("online")) {
    let bricks = result.bricks;
    const since = flag(parsed, "changed-since");
    if (since !== undefined) {
      const changed = new Set(changedBrickFiles(since, cwd));
      bricks = bricks.filter((b) => changed.has(b.file));
    }
    const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    issues.push(...(await checkOnline(bricks, result.ledger, { token })));
  }

  issues.sort(issueSort);
  const merged = { ...result, issues };
  console.log(
    format === "github" ? `${formatGitHub(issues)}\n${formatText(merged)}` : formatText(merged),
  );

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (format === "github" && summaryPath) {
    appendFileSync(summaryPath, formatSummaryMarkdown(merged));
  }
  return countIssues(issues).errors > 0 ? 1 : 0;
}

async function runNew(parsed: Parsed): Promise<number> {
  const repo = parsed.positional[0];
  if (!repo) {
    console.error(
      `Give the repository, for example: pnpm brick:new fastapi/fastapi --sector backend\n\n${USAGE}`,
    );
    return 2;
  }
  const result = await scaffoldBrick({
    rootDir: resolve(process.cwd(), flag(parsed, "root") ?? "registry"),
    repo,
    sector: flag(parsed, "sector"),
    category: flag(parsed, "category"),
    offline: parsed.flags.has("offline"),
    token: process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN,
  });
  if (!result.ok) {
    console.error(result.message);
    return 2;
  }
  console.log(`Created registry/${result.path}`);
  for (const note of result.notes) console.log(`  note: ${note}`);
  console.log(
    "\nNext: write the problemSolved sentence, check the category and tags, then run `pnpm validate`.",
  );
  return 0;
}

function wholeNumber(value: string | undefined, flagName: string): number | undefined | "bad" {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) {
    console.error(`--${flagName} must be a whole number, but got "${value}".`);
    return "bad";
  }
  return Number(value);
}

async function runAdmit(parsed: Parsed): Promise<number> {
  const repo = parsed.positional[0];
  if (!repo) {
    console.error(
      `Give the repository, for example: pnpm admit fastapi/fastapi --impact 4\n\n${USAGE}`,
    );
    return 2;
  }
  const impact = wholeNumber(flag(parsed, "impact"), "impact");
  const githubId = wholeNumber(flag(parsed, "github-id"), "github-id");
  if (impact === "bad" || githubId === "bad") return 2;

  const result = await admitBrick({
    rootDir: resolve(process.cwd(), flag(parsed, "root") ?? "registry"),
    repo,
    impact,
    by: flag(parsed, "by"),
    date: flag(parsed, "date"),
    githubId,
    offline: parsed.flags.has("offline"),
    incubating: parsed.flags.has("incubating"),
    dryRun: parsed.flags.has("dry-run"),
    token: process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN,
  });
  if (!result.ok) {
    console.error(result.message);
    return result.kind === "usage" ? 2 : 1;
  }
  console.log(result.line);
  for (const note of result.notes) console.log(`  note: ${note}`);
  if (!result.wrote) {
    console.log(`\nDry run: that line would be #${result.id}. Nothing was written.`);
    return 0;
  }
  console.log(
    `\nAdded #${result.id} to registry/ledger.jsonl. Commit it, for example:\n  git add registry/ledger.jsonl\n  git commit -m 'chore(registry): admit ${repo.toLowerCase()} as #${result.id}'`,
  );
  return 0;
}

export async function main(argv: string[]): Promise<number> {
  let parsed: Parsed;
  try {
    parsed = parseArgs(argv);
  } catch (error) {
    console.error((error as Error).message);
    return 2;
  }
  try {
    switch (parsed.command) {
      case "validate":
        return await runValidate(parsed);
      case "new":
        return await runNew(parsed);
      case "admit":
        return await runAdmit(parsed);
      default:
        console.error(USAGE);
        return 2;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
}

// Runs only when executed directly, so tests can import `main`.
const entry = process.argv[1] ?? "";
if (entry.endsWith("cli.ts") || entry.endsWith("cli.js")) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(2);
    },
  );
}
