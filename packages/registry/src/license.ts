import { createRequire } from "node:module";
import parse from "spdx-expression-parse";

const require = createRequire(import.meta.url);
const KNOWN: ReadonlySet<string> = new Set(require("spdx-license-ids") as string[]);
const DEPRECATED: ReadonlySet<string> = new Set(require("spdx-license-ids/deprecated") as string[]);
const CANONICAL_CASE: ReadonlyMap<string, string> = new Map(
  [...KNOWN].map((id) => [id.toLowerCase(), id] as const),
);

/** GitHub and many repositories still use the deprecated GNU identifiers. */
export const DEPRECATED_REPLACEMENTS: Readonly<Record<string, string>> = {
  "GPL-1.0": "GPL-1.0-only",
  "GPL-2.0": "GPL-2.0-only",
  "GPL-3.0": "GPL-3.0-only",
  "LGPL-2.0": "LGPL-2.0-only",
  "LGPL-2.1": "LGPL-2.1-only",
  "LGPL-3.0": "LGPL-3.0-only",
  "AGPL-1.0": "AGPL-1.0-only",
  "AGPL-3.0": "AGPL-3.0-only",
  "GFDL-1.1": "GFDL-1.1-only",
  "GFDL-1.2": "GFDL-1.2-only",
  "GFDL-1.3": "GFDL-1.3-only",
};

const PLUS_REPLACEMENTS: Readonly<Record<string, string>> = {
  "GPL-1.0": "GPL-1.0-or-later",
  "GPL-2.0": "GPL-2.0-or-later",
  "GPL-3.0": "GPL-3.0-or-later",
  "LGPL-2.0": "LGPL-2.0-or-later",
  "LGPL-2.1": "LGPL-2.1-or-later",
  "LGPL-3.0": "LGPL-3.0-or-later",
  "AGPL-3.0": "AGPL-3.0-or-later",
};

interface AstNode {
  license?: string;
  plus?: boolean;
  exception?: string;
  left?: AstNode;
  right?: AstNode;
}

export interface LicenseCheck {
  /** Empty when the expression is acceptable. */
  problems: string[];
  warnings: string[];
  /** Modern identifiers found in the expression, in order, without duplicates. */
  ids: string[];
}

function collect(node: AstNode, out: { license: string; plus: boolean }[]): void {
  if (node.left && node.right) {
    collect(node.left, out);
    collect(node.right, out);
    return;
  }
  if (node.license) out.push({ license: node.license, plus: node.plus === true });
}

export function checkLicense(expression: string): LicenseCheck {
  const result: LicenseCheck = { problems: [], warnings: [], ids: [] };
  if (expression !== expression.trim() || /\s{2,}/.test(expression)) {
    result.problems.push("The license has extra spaces. Remove them.");
    return result;
  }
  let ast: AstNode;
  try {
    ast = parse(expression) as AstNode;
  } catch {
    result.problems.push(
      `"${expression}" is not a valid SPDX license expression. Copy the identifier GitHub shows on the repository page, for example "MIT" or "Apache-2.0". Combine with OR or AND, for example "MIT OR Apache-2.0".`,
    );
    return result;
  }
  const found: { license: string; plus: boolean }[] = [];
  collect(ast, found);
  const seen = new Set<string>();
  for (const { license, plus } of found) {
    let id = license;
    if (license.startsWith("LicenseRef-") || license.includes(":LicenseRef-")) {
      result.warnings.push(
        `"${license}" is a custom license reference. A reviewer should read the repository's license text.`,
      );
    } else if (DEPRECATED.has(license)) {
      const modern = (plus ? PLUS_REPLACEMENTS : DEPRECATED_REPLACEMENTS)[license];
      if (modern) {
        result.problems.push(
          `"${plus ? `${license}+` : license}" is a deprecated identifier. Use "${modern}".`,
        );
        id = modern;
      } else {
        result.problems.push(
          `"${license}" is a deprecated SPDX identifier. Look up its replacement.`,
        );
      }
    } else if (!KNOWN.has(license)) {
      const canonical = CANONICAL_CASE.get(license.toLowerCase());
      result.problems.push(
        canonical
          ? `"${license}" has the wrong capitalization. Use "${canonical}".`
          : `"${license}" is not a known SPDX license identifier.`,
      );
    } else if (plus) {
      const modern = PLUS_REPLACEMENTS[license];
      result.problems.push(
        modern
          ? `"${license}+" is deprecated syntax. Use "${modern}".`
          : `"${license}+" is deprecated syntax. Use the "-or-later" identifier if it exists.`,
      );
    }
    if (!seen.has(id)) {
      seen.add(id);
      result.ids.push(id);
    }
  }
  return result;
}

/** Map a GitHub-reported identifier to its modern form. */
export function normalizeLicenseId(id: string): string {
  return DEPRECATED_REPLACEMENTS[id] ?? id;
}

export type LicenseComparison =
  | { kind: "match" }
  | { kind: "unverifiable"; reason: string }
  | { kind: "mismatch"; detected: string };

/**
 * Compare the manifest's license ids with what GitHub detected. GitHub returns a single id, or
 * NOASSERTION when it cannot tell (for example dual-licensed projects and the Linux kernel).
 */
export function compareWithGitHub(
  manifestIds: readonly string[],
  detected: string | null,
): LicenseComparison {
  if (detected === null || detected === "NOASSERTION" || detected === "") {
    return {
      kind: "unverifiable",
      reason:
        "GitHub cannot detect this repository's license. Open its LICENSE file and confirm the identifier in your pull request.",
    };
  }
  const normalized = normalizeLicenseId(detected);
  const wanted = manifestIds.map(normalizeLicenseId);
  if (wanted.includes(normalized)) return { kind: "match" };
  return { kind: "mismatch", detected: normalized };
}
