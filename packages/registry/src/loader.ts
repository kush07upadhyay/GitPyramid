import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BRICKS_DIR } from "./paths";
import type { Issue, RegistryFile, RegistrySnapshot } from "./types";

const decoder = new TextDecoder("utf-8", { fatal: true });

function readText(path: string): { text: string; bytes: number; decodeError: boolean } {
  const buffer = readFileSync(path);
  try {
    return { text: decoder.decode(buffer), bytes: buffer.length, decodeError: false };
  } catch {
    return { text: "", bytes: buffer.length, decodeError: true };
  }
}

export interface LoadedRegistry {
  snapshot: RegistrySnapshot;
  /** Problems found while reading, such as symbolic links. */
  issues: Issue[];
}

function symlinkIssue(rootLabel: string, rel: string): Issue {
  return {
    severity: "error",
    file: `${rootLabel}/${rel}`,
    code: "SYMLINK",
    message: "Symbolic links are not allowed in the registry.",
  };
}

function isSymlink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function walk(
  dir: string,
  relative: string,
  rootLabel: string,
  files: RegistryFile[],
  issues: Issue[],
): void {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const entry of entries) {
    const abs = join(dir, entry.name);
    const rel = relative === "" ? entry.name : `${relative}/${entry.name}`;
    if (isSymlink(abs)) {
      issues.push(symlinkIssue(rootLabel, rel));
    } else if (entry.isDirectory()) {
      walk(abs, rel, rootLabel, files, issues);
    } else if (entry.isFile()) {
      files.push({ path: rel, ...readText(abs) });
    }
  }
}

/** Read the registry folder into memory. Validation itself never touches the disk. */
export function loadRegistry(rootDir: string, rootLabel = "registry"): LoadedRegistry {
  const issues: Issue[] = [];
  const brickFiles: RegistryFile[] = [];
  const bricksRoot = join(rootDir, BRICKS_DIR);
  // A pull request can contain a symlink in place of a folder or file. Following it would let the
  // validator read files outside the registry, so every entry point is checked, not only the files.
  if (isSymlink(bricksRoot)) {
    issues.push(symlinkIssue(rootLabel, BRICKS_DIR));
  } else {
    try {
      walk(bricksRoot, BRICKS_DIR, rootLabel, brickFiles, issues);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  const optional = (name: string): string | undefined => {
    const path = join(rootDir, name);
    if (isSymlink(path)) {
      issues.push(symlinkIssue(rootLabel, name));
      return undefined;
    }
    try {
      const read = readText(path);
      return read.decodeError ? "\u0000" : read.text;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  };
  return {
    snapshot: {
      brickFiles,
      taxonomyText: optional("taxonomy.json"),
      ledgerText: optional("ledger.jsonl"),
    },
    issues,
  };
}
