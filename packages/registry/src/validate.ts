import type { Node } from "jsonc-parser";
import { parseStrictJson } from "./json";
import { checkLicense } from "./license";
import { BRICKS_DIR, parseBrickPath } from "./paths";
import { LineIndex } from "./positions";
import {
  BRICK_SCHEMA_REF,
  BrickSchema,
  DERIVED_FIELDS,
  type LedgerEntry,
  LedgerEntrySchema,
  LIMITS,
} from "./schema";
import { loadTaxonomy, type TaxonomyIndex } from "./taxonomy";
import { plainTextProblems, plainTextWarnings } from "./text-safety";
import {
  type Issue,
  issueSort,
  type RegistrySnapshot,
  type Severity,
  type ValidatedBrick,
  type ValidateOptions,
  type ValidationResult,
} from "./types";
import { checkWebsite } from "./website";
import { describeIssue, valueAt, type ZodIssueLike } from "./zod-messages";

export const ALLOWED_BRICK_KEYS: readonly string[] = Object.keys(BrickSchema.shape);

function isRealDate(value: string): boolean {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** The day after a YYYY-MM-DD date. Maintainers write local dates, and CI runs in UTC. */
export function nextDay(value: string): string {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

interface Pending {
  file: string;
  tree: Node;
  index: LineIndex;
  full: string;
  brick: ValidatedBrick["brick"];
}

export function validateRegistry(
  snapshot: RegistrySnapshot,
  options: ValidateOptions = {},
): ValidationResult {
  const root = options.rootLabel ?? "registry";
  const at = (path: string) => `${root}/${path}`;
  const issues: Issue[] = [];

  const add = (
    severity: Severity,
    file: string,
    code: string,
    message: string,
    where?: { index: LineIndex; offset: number },
  ) => {
    const pos = where ? where.index.positionAt(where.offset) : undefined;
    issues.push({
      severity,
      file,
      code,
      message,
      ...(pos ? { line: pos.line, column: pos.column } : {}),
    });
  };

  // Taxonomy -----------------------------------------------------------------------------------
  let taxonomy: TaxonomyIndex | undefined;
  const taxonomyFile = at("taxonomy.json");
  if (snapshot.taxonomyText === undefined) {
    add("error", taxonomyFile, "TAXONOMY", "taxonomy.json is missing.");
  } else {
    const loaded = loadTaxonomy(snapshot.taxonomyText);
    if (loaded.ok) taxonomy = loaded.index;
    else for (const problem of loaded.problems) add("error", taxonomyFile, "TAXONOMY", problem);
  }

  // Which repositories have a manifest, judged by path alone, so references do not cascade. -----
  const files = [...snapshot.brickFiles].sort((a, b) => a.path.localeCompare(b.path));
  const knownRepos = new Set<string>();
  for (const f of files) {
    const info = parseBrickPath(f.path);
    if (!("problem" in info)) knownRepos.add(info.full);
  }

  // Bricks -------------------------------------------------------------------------------------
  const pending: Pending[] = [];
  const bricks: ValidatedBrick[] = [];

  for (const f of files) {
    const file = at(f.path);
    const info = parseBrickPath(f.path);
    if ("problem" in info) add("error", file, "PATH", info.problem);

    if (f.decodeError) {
      add("error", file, "ENCODING", "The file is not valid UTF-8 text. Save it as UTF-8.");
      continue;
    }
    if (f.bytes > LIMITS.maxFileBytes) {
      add(
        "error",
        file,
        "FILE_TOO_LARGE",
        `The file is ${f.bytes} bytes. A manifest must be at most ${LIMITS.maxFileBytes} bytes.`,
      );
      continue;
    }
    if (!f.path.endsWith(".json")) continue;

    let text = f.text;
    if (text.charCodeAt(0) === 0xfeff) {
      add(
        "error",
        file,
        "BOM",
        "The file starts with a byte order mark. Save it as UTF-8 without BOM.",
      );
      text = text.slice(1);
    }
    const index = new LineIndex(text);

    const json = parseStrictJson(text);
    if (!json.ok) {
      const first = json.errors[0] as (typeof json.errors)[number];
      add("error", file, "JSON", first.message, { index, offset: first.offset });
      continue;
    }
    const { tree, value } = json;
    if (tree.type !== "object" || typeof value !== "object" || value === null) {
      add(
        "error",
        file,
        "NOT_OBJECT",
        "A manifest is one JSON object that starts with { and ends with }.",
        {
          index,
          offset: tree.offset,
        },
      );
      continue;
    }
    for (const dup of json.duplicates) {
      add(
        "error",
        file,
        "DUPLICATE_KEY",
        `"${dup.key}" appears more than once. Remove one of them.`,
        {
          index,
          offset: dup.offset,
        },
      );
    }

    // Unknown and derived fields, with an explanation for the ones people copy from the plan.
    for (const prop of tree.children ?? []) {
      const keyNode = prop.children?.[0];
      const key = keyNode?.value;
      if (typeof key !== "string" || !keyNode) continue;
      if (Object.hasOwn(DERIVED_FIELDS, key)) {
        add(
          "error",
          file,
          "DERIVED_FIELD",
          `"${key}" is not allowed in a manifest: ${DERIVED_FIELDS[key]}. Remove the line.`,
          { index, offset: keyNode.offset },
        );
      } else if (!ALLOWED_BRICK_KEYS.includes(key)) {
        add(
          "error",
          file,
          "UNKNOWN_FIELD",
          `"${key}" is not a field a manifest can have. Allowed fields: ${ALLOWED_BRICK_KEYS.filter((k) => k !== "$schema").join(", ")}.`,
          { index, offset: keyNode.offset },
        );
      }
    }

    const record = value as Record<string, unknown>;
    const claimedRepo = typeof record.repo === "string" ? record.repo : undefined;
    if (claimedRepo !== undefined && !("problem" in info)) {
      const repoNode = valueAt(tree, ["repo"]);
      const where = repoNode ? { index, offset: repoNode.offset } : undefined;
      if (claimedRepo === "owner/repo") {
        add(
          "error",
          file,
          "PLACEHOLDER",
          'repo is still "owner/repo". Use the real repository.',
          where,
        );
      } else if (claimedRepo !== info.full) {
        add(
          "error",
          file,
          "REPO_MISMATCH",
          `repo says "${claimedRepo}" but the file path says "${info.full}". Rename the file to ${root}/${BRICKS_DIR}/${claimedRepo.toLowerCase()}.json or fix the repo field. Use lowercase.`,
          where,
        );
      }
    }

    const parsed = BrickSchema.safeParse(value);
    if (!parsed.success) {
      const seen = new Set<string>();
      for (const zodIssue of parsed.error.issues) {
        const described = describeIssue(zodIssue as unknown as ZodIssueLike, tree);
        if (!described || seen.has(described.message)) continue;
        seen.add(described.message);
        add("error", file, "SCHEMA", described.message, { index, offset: described.offset });
      }
      continue;
    }
    const brick = parsed.data;
    const pointAt = (field: string) => {
      const node = valueAt(tree, [field]);
      return node ? { index, offset: node.offset } : undefined;
    };
    const report = (severity: Severity, code: string, message: string, field: string) =>
      add(severity, file, code, message, pointAt(field) ?? { index, offset: tree.offset });

    if (brick.$schema !== undefined && brick.$schema !== BRICK_SCHEMA_REF) {
      report(
        "error",
        "SCHEMA_REF",
        `$schema must be exactly "${BRICK_SCHEMA_REF}" or the line removed.`,
        "$schema",
      );
    }

    for (const [field, kind, text2] of [
      ["name", "name", brick.name],
      ["problemSolved", "sentence", brick.problemSolved],
    ] as const) {
      for (const p of plainTextProblems(text2, field, kind))
        report("error", p.code, p.message, field);
      for (const w of plainTextWarnings(text2, field, kind))
        report("warning", w.code, w.message, field);
    }

    const tags = new Set<string>();
    brick.techStack.forEach((tag, i) => {
      const node = valueAt(tree, ["techStack", i]);
      const where = node ? { index, offset: node.offset } : undefined;
      if (tags.has(tag))
        add("error", file, "DUPLICATE_TAG", `techStack lists "${tag}" more than once.`, where);
      tags.add(tag);
      if (tag === "replace-me") {
        add(
          "error",
          file,
          "PLACEHOLDER",
          `techStack still contains the placeholder "${tag}". Use real tags.`,
          where,
        );
      }
    });

    if (taxonomy) {
      const categories = taxonomy.sectorCategories.get(brick.sector) ?? [];
      if (!categories.includes(brick.category)) {
        const other = taxonomy.categorySector.get(brick.category);
        const hint = other
          ? `"${brick.category}" belongs to the "${other}" sector. Change sector or pick a category of "${brick.sector}".`
          : `"${brick.category}" is not a category. Categories of "${brick.sector}": ${categories.join(", ")}. If none fits, open a taxonomy request issue.`;
        report("error", "CATEGORY", hint, "category");
      }
    }

    const license = checkLicense(brick.license);
    for (const p of license.problems) report("error", "LICENSE", p, "license");
    for (const w of license.warnings) report("warning", "LICENSE", w, "license");

    if (brick.website !== undefined) {
      const site = checkWebsite(brick.website);
      for (const p of site.problems) report("error", "WEBSITE", p, "website");
      for (const w of site.warnings) report("warning", "WEBSITE", w, "website");
    }

    for (const field of ["compatibleWith", "alternatives"] as const) {
      const list = brick[field] ?? [];
      const seen = new Set<string>();
      list.forEach((entry, i) => {
        const node = valueAt(tree, [field, i]);
        const where = node ? { index, offset: node.offset } : undefined;
        if (!("problem" in info) && entry === info.full) {
          add(
            "error",
            file,
            "SELF_REFERENCE",
            `${field} lists this brick itself. Remove it.`,
            where,
          );
        }
        if (seen.has(entry))
          add(
            "error",
            file,
            "DUPLICATE_REFERENCE",
            `${field} lists "${entry}" more than once.`,
            where,
          );
        seen.add(entry);
      });
    }
    const both = (brick.compatibleWith ?? []).filter((r) => (brick.alternatives ?? []).includes(r));
    if (both.length > 0) {
      report(
        "warning",
        "OVERLAP",
        `${both.join(", ")} is in both compatibleWith and alternatives. A project is usually one or the other.`,
        "alternatives",
      );
    }

    if (!("problem" in info)) {
      pending.push({ file, tree, index, full: info.full, brick });
      bricks.push({
        path: f.path,
        file,
        owner: info.owner,
        repo: info.repo,
        full: info.full,
        brick,
      });
    }
  }

  // References must point at bricks that exist --------------------------------------------------
  for (const p of pending) {
    for (const field of ["compatibleWith", "alternatives"] as const) {
      (p.brick[field] ?? []).forEach((entry, i) => {
        if (entry === p.full || knownRepos.has(entry)) return;
        const node = valueAt(p.tree, [field, i]);
        add(
          "error",
          p.file,
          "UNKNOWN_REFERENCE",
          `${field} lists "${entry}", which has no brick yet. Add that brick first in its own pull request, or remove this entry.`,
          node ? { index: p.index, offset: node.offset } : undefined,
        );
      });
    }
  }

  // Ledger -------------------------------------------------------------------------------------
  const ledgerFile = at("ledger.jsonl");
  const ledger: LedgerEntry[] = [];
  if (snapshot.ledgerText !== undefined) {
    const seenRepos = new Map<string, number>();
    const seenGithubIds = new Map<number, number>();
    const lines = snapshot.ledgerText.replace(/^\uFEFF/, "").split("\n");
    lines.forEach((rawLine, i) => {
      const line = rawLine.replace(/\r$/, "");
      if (line.trim() === "") return;
      const lineNo = i + 1;
      const lineIndex = new LineIndex(line);
      const here = (message: string, code = "LEDGER") =>
        issues.push({ severity: "error", file: ledgerFile, line: lineNo, code, message });
      const json = parseStrictJson(line);
      if (!json.ok) {
        const first = json.errors[0] as (typeof json.errors)[number];
        const pos = lineIndex.positionAt(first.offset);
        issues.push({
          severity: "error",
          file: ledgerFile,
          line: lineNo,
          column: pos.column,
          code: "LEDGER",
          message: first.message,
        });
        return;
      }
      const parsed = LedgerEntrySchema.safeParse(json.value);
      if (!parsed.success) {
        for (const zodIssue of parsed.error.issues) {
          here(`${zodIssue.path.join(".") || "entry"}: ${zodIssue.message}`);
        }
        return;
      }
      const entry = parsed.data;
      const expected = ledger.length + 1;
      if (entry.id !== expected) {
        here(
          `id is ${entry.id} but the next id must be ${expected}. Ids are 1, 2, 3 in order and are never reused.`,
        );
      }
      if (!isRealDate(entry.admitted)) {
        here(`admitted "${entry.admitted}" is not a real date.`);
      } else if (options.today !== undefined && entry.admitted > nextDay(options.today)) {
        here(`admitted "${entry.admitted}" is in the future.`);
      }
      const key = entry.repo.toLowerCase();
      if (entry.repo !== key) here(`repo "${entry.repo}" must be lowercase.`);
      const firstSeen = seenRepos.get(key);
      if (firstSeen !== undefined)
        here(`repo "${entry.repo}" already has an entry on line ${firstSeen}.`);
      else seenRepos.set(key, lineNo);
      if (entry.githubId !== undefined) {
        const prior = seenGithubIds.get(entry.githubId);
        if (prior !== undefined)
          here(`githubId ${entry.githubId} is already used on line ${prior}.`);
        else seenGithubIds.set(entry.githubId, lineNo);
      }
      ledger.push(entry);
    });

    for (const entry of ledger) {
      const has = knownRepos.has(entry.repo);
      if (entry.retired && has) {
        issues.push({
          severity: "error",
          file: ledgerFile,
          code: "LEDGER_RETIRED_HAS_FILE",
          message: `#${entry.id} ${entry.repo} is retired but ${root}/${BRICKS_DIR}/${entry.repo}.json still exists. Delete the file or un-retire the entry.`,
        });
      } else if (!entry.retired && !has) {
        issues.push({
          severity: "error",
          file: ledgerFile,
          code: "LEDGER_ORPHAN",
          message: `#${entry.id} points at ${entry.repo}, which has no manifest. Restore the file, or mark the entry "retired": true.`,
        });
      }
    }
  }

  const admitted = new Set(ledger.filter((e) => !e.retired).map((e) => e.repo));
  for (const b of bricks) {
    if (!admitted.has(b.full)) {
      add(
        options.requireLedger ? "error" : "warning",
        b.file,
        "NOT_ADMITTED",
        "This brick is waiting for a maintainer to admit it (an id and an impact level). Nothing for you to do.",
      );
    }
  }

  issues.sort(issueSort);
  return { issues, bricks, ledger };
}
