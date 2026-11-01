import type { Brick, LedgerEntry } from "./schema";

export type Severity = "error" | "warning";

export interface Issue {
  severity: Severity;
  /** Path from the repository root, for example registry/bricks/fastapi/fastapi.json */
  file: string;
  /** 1-based */
  line?: number;
  /** 1-based */
  column?: number;
  code: string;
  message: string;
}

export interface RegistryFile {
  /** Relative to the registry folder, with forward slashes. */
  path: string;
  text: string;
  bytes: number;
  /** True when the bytes are not valid UTF-8. `text` is empty then. */
  decodeError?: boolean;
}

export interface RegistrySnapshot {
  /** Every file found under bricks/, so stray files can be reported. */
  brickFiles: RegistryFile[];
  taxonomyText: string | undefined;
  ledgerText: string | undefined;
}

export interface ValidatedBrick {
  /** Relative to the registry folder. */
  path: string;
  /** From the repository root. */
  file: string;
  owner: string;
  repo: string;
  /** owner/repo from the path */
  full: string;
  brick: Brick;
}

export interface ValidationResult {
  issues: Issue[];
  bricks: ValidatedBrick[];
  ledger: LedgerEntry[];
}

export interface ValidateOptions {
  /** Folder name used in messages. Defaults to "registry". */
  rootLabel?: string;
  /** Treat bricks without a ledger entry as errors. Maintainers use this before a release. */
  requireLedger?: boolean;
  /** Today as YYYY-MM-DD. When set, ledger dates after it are errors. Keeps the validator pure. */
  today?: string;
}

export function issueSort(a: Issue, b: Issue): number {
  return (
    a.file.localeCompare(b.file) ||
    (a.line ?? 0) - (b.line ?? 0) ||
    (a.column ?? 0) - (b.column ?? 0) ||
    a.code.localeCompare(b.code) ||
    a.message.localeCompare(b.message)
  );
}
