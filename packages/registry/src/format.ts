import type { Issue, ValidationResult } from "./types";

/** GitHub workflow command escaping. Unescaped newlines would let text inject new commands. */
export function escapeData(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

export function escapeProperty(value: string): string {
  return escapeData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}

export function formatGitHub(issues: readonly Issue[]): string {
  return issues
    .map((issue) => {
      const props = [`file=${escapeProperty(issue.file)}`];
      if (issue.line !== undefined) props.push(`line=${issue.line}`);
      if (issue.column !== undefined) props.push(`col=${issue.column}`);
      props.push(`title=${escapeProperty(issue.code)}`);
      return `::${issue.severity} ${props.join(",")}::${escapeData(issue.message)}`;
    })
    .join("\n");
}

export interface Counts {
  errors: number;
  warnings: number;
}

export function countIssues(issues: readonly Issue[]): Counts {
  let errors = 0;
  let warnings = 0;
  for (const issue of issues) {
    if (issue.severity === "error") errors++;
    else warnings++;
  }
  return { errors, warnings };
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function formatText(result: ValidationResult, extra: readonly Issue[] = []): string {
  const issues = [...result.issues, ...extra];
  const lines: string[] = [];
  let currentFile = "";
  for (const issue of issues) {
    if (issue.file !== currentFile) {
      if (currentFile !== "") lines.push("");
      lines.push(issue.file);
      currentFile = issue.file;
    }
    const where = issue.line !== undefined ? `${issue.line}:${issue.column ?? 1}` : "";
    lines.push(
      `  ${issue.severity.padEnd(7)} ${where.padEnd(7)} ${issue.code.padEnd(14)} ${issue.message}`,
    );
  }
  const { errors, warnings } = countIssues(issues);
  if (lines.length > 0) lines.push("");
  lines.push(
    `${plural(result.bricks.length, "brick")} checked: ${plural(errors, "error")}, ${plural(warnings, "warning")}.`,
  );
  return lines.join("\n");
}

/** Escape text for a Markdown table cell. Contributor text must never become markup. */
export function escapeCell(value: string): string {
  return value.replace(/[\\`*_{}[\]<>()#+!|~]/g, (ch) => `\\${ch}`).replace(/[\r\n]+/g, " ");
}

export function formatSummaryMarkdown(
  result: ValidationResult,
  extra: readonly Issue[] = [],
): string {
  const issues = [...result.issues, ...extra];
  const { errors, warnings } = countIssues(issues);
  const out: string[] = [];
  out.push("## Registry check");
  out.push("");
  out.push(
    `${plural(result.bricks.length, "brick")} checked: **${plural(errors, "error")}**, ${plural(warnings, "warning")}.`,
  );
  if (issues.length > 0) {
    out.push("");
    out.push("| Level | File | Line | Code | What to do |");
    out.push("| :--- | :--- | ---: | :--- | :--- |");
    for (const issue of issues) {
      out.push(
        `| ${issue.severity} | ${escapeCell(issue.file)} | ${issue.line ?? ""} | ${escapeCell(issue.code)} | ${escapeCell(issue.message)} |`,
      );
    }
  } else {
    out.push("");
    out.push("Everything looks good.");
  }
  return `${out.join("\n")}\n`;
}
