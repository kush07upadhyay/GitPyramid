import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { countIssues, formatGitHub } from "../packages/registry/src/format";
import type { Issue } from "../packages/registry/src/types";

/**
 * Checks that relative links in Markdown point at files that exist, with the exact letter case
 * GitHub needs, and that `#anchors` match a heading in the target. External links are not fetched,
 * because that makes a check flaky.
 */

/** GitHub's anchor for a heading: lowercase, drop punctuation, spaces become hyphens. */
export function slugify(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

/** The text a reader sees for a heading: no emphasis marks, code ticks, links or HTML tags. */
export function headingText(raw: string): string {
  return raw
    .replace(/\s+#+\s*$/, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/`/g, "")
    .replace(/\*+/g, "")
    .trim();
}

const FENCE = /^\s{0,3}(```|~~~)/;

/** Every anchor a file offers. Repeated headings get -1, -2 and so on, like GitHub. */
export function collectAnchors(markdown: string): Set<string> {
  const anchors = new Set<string>();
  const seen = new Map<string, number>();
  let inFence = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(/^ {0,3}#{1,6}\s+(.+?)\s*$/);
    if (!match) continue;
    const base = slugify(headingText(match[1] as string));
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }
  return anchors;
}

export interface Link {
  target: string;
  line: number;
}

const INLINE =
  /!?\[[^\]]*\]\(\s*(?:<([^<>\n]+)>|((?:[^()\s<>]|\([^()\s]*\))+))(?:\s+"[^"]*")?\s*\)/g;
const REFERENCE = /^\s{0,3}\[[^\]]+\]:\s*<?([^\s>]+)>?/;
const HTML_ATTRIBUTE = /\b(?:href|src)\s*=\s*"([^"]+)"/gi;

/** Links outside code. Inline links, images, reference definitions and `href` or `src` attributes. */
export function collectLinks(markdown: string): Link[] {
  const links: Link[] = [];
  let inFence = false;
  markdown.split(/\r?\n/).forEach((rawLine, index) => {
    if (FENCE.test(rawLine)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const line = rawLine.replace(/`[^`]*`/g, "``");
    const lineNo = index + 1;
    for (const m of line.matchAll(INLINE)) {
      links.push({ target: (m[1] ?? m[2]) as string, line: lineNo });
    }
    const ref = line.match(REFERENCE);
    if (ref) links.push({ target: ref[1] as string, line: lineNo });
    for (const m of line.matchAll(HTML_ATTRIBUTE))
      links.push({ target: m[1] as string, line: lineNo });
  });
  return links;
}

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const LINE_ANCHOR = /^L\d+(?:C\d+)?(?:-L\d+(?:C\d+)?)?$/;

export interface Problem {
  file: string;
  line: number;
  target: string;
  reason: "missing-file" | "wrong-case" | "missing-anchor" | "outside-repository";
}

/** Exact-case existence, because GitHub is case-sensitive and Windows and macOS are not. */
class ExactFileSystem {
  private readonly listings = new Map<string, string[] | null>();

  private list(dir: string): string[] | null {
    if (!this.listings.has(dir)) {
      try {
        this.listings.set(dir, readdirSync(dir));
      } catch {
        this.listings.set(dir, null);
      }
    }
    return this.listings.get(dir) ?? null;
  }

  /** "ok", "wrong-case" or "missing". */
  check(root: string, absolute: string): "ok" | "wrong-case" | "missing" {
    if (!existsSync(absolute)) return "missing";
    const relative = absolute.slice(root.length).split(sep).filter(Boolean);
    let current = root;
    for (const part of relative) {
      const names = this.list(current);
      if (names === null) return "missing";
      if (!names.includes(part)) return "wrong-case";
      current = `${current}${sep}${part}`;
    }
    return "ok";
  }
}

export interface SourceFile {
  /** Path relative to the root, with forward slashes. */
  path: string;
  text: string;
}

export function checkLinks(root: string, files: readonly SourceFile[]): Problem[] {
  const absoluteRoot = resolve(root);
  const fs = new ExactFileSystem();
  const anchorCache = new Map<string, Set<string>>();
  const anchorsOf = (path: string, text?: string): Set<string> => {
    let anchors = anchorCache.get(path);
    if (!anchors) {
      anchors = collectAnchors(text ?? readFileSync(path, "utf8"));
      anchorCache.set(path, anchors);
    }
    return anchors;
  };

  const problems: Problem[] = [];
  for (const file of files) {
    const filePath = resolve(absoluteRoot, file.path);
    for (const link of collectLinks(file.text)) {
      if (EXTERNAL.test(link.target)) continue;
      const hashAt = link.target.indexOf("#");
      const pathPart = (hashAt === -1 ? link.target : link.target.slice(0, hashAt)).split(
        "?",
      )[0] as string;
      const hash = hashAt === -1 ? "" : link.target.slice(hashAt + 1);
      const report = (reason: Problem["reason"]) =>
        problems.push({ file: file.path, line: link.line, target: link.target, reason });

      let destination = filePath;
      if (pathPart !== "") {
        let decoded = pathPart;
        try {
          decoded = decodeURIComponent(pathPart);
        } catch {
          // Leave a malformed escape as it is. The file check below will report it.
        }
        destination = decoded.startsWith("/")
          ? resolve(absoluteRoot, `.${decoded}`)
          : resolve(dirname(filePath), decoded);
        if (destination !== absoluteRoot && !destination.startsWith(absoluteRoot + sep)) {
          report("outside-repository");
          continue;
        }
        const state = fs.check(absoluteRoot, destination);
        if (state !== "ok") {
          report(state === "wrong-case" ? "wrong-case" : "missing-file");
          continue;
        }
      }

      if (hash === "" || LINE_ANCHOR.test(hash)) continue;
      const own = destination === filePath;
      if (!destination.toLowerCase().endsWith(".md") || !(own || statSync(destination).isFile())) {
        continue;
      }
      const anchors = anchorsOf(destination, own ? file.text : undefined);
      let wanted = hash;
      try {
        wanted = decodeURIComponent(hash);
      } catch {
        // Keep the raw fragment.
      }
      if (!anchors.has(wanted.toLowerCase())) report("missing-anchor");
    }
  }
  return problems;
}

const REASONS: Record<Problem["reason"], string> = {
  "missing-file": "points at a file that does not exist",
  "wrong-case": "uses the wrong letter case, which works on Windows but breaks on GitHub",
  "missing-anchor": "points at a heading that does not exist in the target",
  "outside-repository": "points outside the repository",
};

export function toIssues(problems: readonly Problem[]): Issue[] {
  return problems.map((p) => ({
    severity: "error",
    file: p.file,
    line: p.line,
    code: "LINK",
    message: `"${p.target}" ${REASONS[p.reason]}.`,
  }));
}

/** Files that are generated, vendored or kept verbatim, so their links are not ours to fix. */
export function isExcluded(path: string): boolean {
  return (
    path.startsWith(".specify/") ||
    path.startsWith(".github/skills/") ||
    path.includes("node_modules/") ||
    path === "docs/GitHub Pyramid Idea Analysis.md"
  );
}

export function listMarkdown(root: string): string[] {
  const out = execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "*.md"],
    { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  return out
    .split("\0")
    .filter((p) => p !== "" && !isExcluded(p))
    .sort();
}

export function run(argv: string[]): number {
  const root = resolve(process.cwd());
  const github = argv.includes("--format") && argv[argv.indexOf("--format") + 1] === "github";
  const paths = listMarkdown(root).filter((p) => existsSync(resolve(root, p)));
  const files = paths.map((path) => ({ path, text: readFileSync(resolve(root, path), "utf8") }));
  const issues = toIssues(checkLinks(root, files));
  if (github && issues.length > 0) console.log(formatGitHub(issues));
  for (const issue of issues) console.log(`${issue.file}:${issue.line}  ${issue.message}`);
  const { errors } = countIssues(issues);
  console.log(
    `${files.length} Markdown files checked: ${errors} broken link${errors === 1 ? "" : "s"}.`,
  );
  return errors > 0 ? 1 : 0;
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("check-links.ts") || entry.endsWith("check-links.js")) {
  try {
    process.exit(run(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}
