import type { Node } from "jsonc-parser";
import { LIMITS, SECTORS } from "./schema";

/** Minimal shape of a Zod 4 issue, so this file does not depend on Zod's internal types. */
export interface ZodIssueLike {
  code: string;
  path: ReadonlyArray<PropertyKey>;
  message: string;
  origin?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  expected?: string;
  values?: readonly unknown[];
  format?: string;
}

const FIELD_HELP: Record<string, string> = {
  schemaVersion: "Use 1.",
  repo: 'Use lowercase "owner/repo", for example "fastapi/fastapi".',
  name: `Use the project's display name, up to ${LIMITS.nameMax} characters.`,
  sector: `Use one of: ${SECTORS.join(", ")}.`,
  category: 'Use a lowercase category id such as "web-frameworks". See registry/taxonomy.json.',
  problemSolved: `Write one plain sentence of ${LIMITS.problemMin} to ${LIMITS.problemMax} characters that ends with a period.`,
  techStack: `Use 1 to ${LIMITS.techStackMax} lowercase tags such as "python" or "c++".`,
  license: 'Use the SPDX identifier GitHub shows, for example "MIT".',
  website: "Use an https link or remove the field.",
  compatibleWith: `Use up to ${LIMITS.compatibleMax} lowercase "owner/repo" entries that already have bricks.`,
  alternatives: `Use up to ${LIMITS.alternativesMax} lowercase "owner/repo" entries that already have bricks.`,
  $schema: `Use exactly "../../schema/brick.schema.json" or remove the line.`,
};

export function fieldLabel(path: ReadonlyArray<PropertyKey>): string {
  const [head, index] = path;
  const name = String(head ?? "the file");
  return index === undefined ? name : `${name} item ${Number(index) + 1}`;
}

export function valueAt(tree: Node, path: ReadonlyArray<PropertyKey>): Node | undefined {
  let node: Node | undefined = tree;
  for (const segment of path) {
    if (!node) return undefined;
    if (node.type === "object") {
      const prop: Node | undefined = node.children?.find(
        (child) => child.children?.[0]?.value === segment,
      );
      node = prop?.children?.[1];
    } else if (node.type === "array" && typeof segment === "number") {
      node = node.children?.[segment];
    } else {
      return undefined;
    }
  }
  return node;
}

export function keyNodeAt(tree: Node, key: string): Node | undefined {
  const prop = tree.children?.find((child) => child.children?.[0]?.value === key);
  return prop?.children?.[0];
}

export interface Described {
  message: string;
  /** Offset to point at. */
  offset: number;
}

/** Turn a Zod issue into one plain sentence with a fix, plus a place in the file. */
export function describeIssue(issue: ZodIssueLike, tree: Node): Described | undefined {
  if (issue.code === "unrecognized_keys") return undefined;
  const path = issue.path;
  const label = fieldLabel(path);
  const rootField = String(path[0] ?? "");
  const help = FIELD_HELP[rootField] ?? "";
  const node = valueAt(tree, path);
  const offset = node?.offset ?? keyNodeAt(tree, rootField)?.offset ?? tree.offset;
  const suffix = help ? ` ${help}` : "";

  if (node === undefined && path.length > 0) {
    return { message: `${label} is missing.${suffix}`, offset: tree.offset };
  }

  if (issue.code === "invalid_type") {
    return {
      message: `${label} has the wrong type (expected ${issue.expected ?? "another type"}).${suffix}`,
      offset,
    };
  }

  if (issue.code === "too_small" || issue.code === "too_big") {
    const isString = issue.origin === "string";
    const size = isString
      ? `${typeof node?.value === "string" ? node.value.length : 0} characters`
      : `${node?.children?.length ?? 0} items`;
    const bound =
      issue.code === "too_small"
        ? `at least ${String(issue.minimum)}`
        : `at most ${String(issue.maximum)}`;
    return {
      message: `${label} has ${size}, but must have ${bound}.${suffix}`,
      offset,
    };
  }

  if (issue.code === "invalid_format") {
    if (rootField === "problemSolved") {
      return { message: `${label} must end with a period.${suffix}`, offset };
    }
    return { message: `${label} is not in the right format.${suffix}`, offset };
  }

  if (issue.code === "invalid_value") {
    const allowed = (issue.values ?? []).map(String).join(", ");
    return { message: `${label} must be one of: ${allowed}.`, offset };
  }

  return { message: `${label}: ${issue.message}${suffix}`, offset };
}
