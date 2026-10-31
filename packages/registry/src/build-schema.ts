import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { BrickSchema } from "./schema";

export const SCHEMA_ID = "https://gitpyramid.com/schema/brick/v1.json";

/** The JSON Schema editors use. Generated from the Zod schema, never edited by hand. */
export function generateBrickJsonSchema(): string {
  const generated = z.toJSONSchema(BrickSchema, { target: "draft-7" }) as Record<string, unknown>;
  const schema = {
    $schema: generated.$schema,
    $id: SCHEMA_ID,
    title: "GitPyramid brick manifest",
    description:
      "Facts about one open-source project. Scores, states, ids and positions are not stored here.",
    ...generated,
  };
  return `${JSON.stringify(schema, null, 2)}\n`;
}

export const SCHEMA_FILE = "registry/schema/brick.schema.json";

if ((process.argv[1] ?? "").endsWith("build-schema.ts")) {
  const target = resolve(process.cwd(), SCHEMA_FILE);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, generateBrickJsonSchema());
  console.log(`Wrote ${SCHEMA_FILE}`);
}
