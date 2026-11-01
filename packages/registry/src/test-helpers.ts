import { readFileSync } from "node:fs";
import type { RegistryFile, RegistrySnapshot, ValidateOptions, ValidationResult } from "./types";
import { validateRegistry } from "./validate";

export const TAXONOMY_TEXT = readFileSync(
  new URL("../../../registry/taxonomy.json", import.meta.url),
  "utf8",
);

export function brick(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    $schema: "../../schema/brick.schema.json",
    schemaVersion: 1,
    repo: "fastapi/fastapi",
    name: "FastAPI",
    sector: "backend",
    category: "web-frameworks",
    problemSolved: "Builds typed, fast web APIs in Python with automatic OpenAPI documentation.",
    techStack: ["python", "asgi"],
    license: "MIT",
    ...over,
  };
}

export function file(path: string, content: unknown): RegistryFile {
  const text = typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`;
  return { path, text, bytes: new TextEncoder().encode(text).length };
}

export function snap(
  files: RegistryFile[],
  extra: Partial<RegistrySnapshot> = {},
): RegistrySnapshot {
  return { brickFiles: files, taxonomyText: TAXONOMY_TEXT, ledgerText: undefined, ...extra };
}

export function ledgerLine(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: 1,
    repo: "fastapi/fastapi",
    admitted: "2026-11-01",
    impact: 4,
    ...over,
  });
}

export function run(
  files: RegistryFile[],
  extra: Partial<RegistrySnapshot> = {},
  options: ValidateOptions = {},
): ValidationResult {
  return validateRegistry(snap(files, extra), options);
}

export function codes(result: ValidationResult): string[] {
  return result.issues.map((i) => `${i.severity}:${i.code}`);
}

export const FASTAPI = file("bricks/fastapi/fastapi.json", brick());
