import { type ParseError, parse as parseJsonc, printParseErrorCode } from "jsonc-parser";
import { type Taxonomy, TaxonomySchema } from "./schema";

export interface TaxonomyIndex {
  taxonomy: Taxonomy;
  /** category id to sector id */
  categorySector: ReadonlyMap<string, string>;
  /** sector id to category ids, in file order */
  sectorCategories: ReadonlyMap<string, readonly string[]>;
}

export type TaxonomyResult = { ok: true; index: TaxonomyIndex } | { ok: false; problems: string[] };

export function loadTaxonomy(text: string): TaxonomyResult {
  const errors: ParseError[] = [];
  const value: unknown = parseJsonc(text, errors, { allowTrailingComma: false });
  if (errors.length > 0) {
    const first = errors[0] as ParseError;
    return {
      ok: false,
      problems: [`taxonomy.json is not valid JSON (${printParseErrorCode(first.error)}).`],
    };
  }
  const parsed = TaxonomySchema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      problems: parsed.error.issues.map((i) => `taxonomy.json ${i.path.join(".")}: ${i.message}`),
    };
  }
  const taxonomy = parsed.data;
  const problems: string[] = [];
  const categorySector = new Map<string, string>();
  const sectorCategories = new Map<string, readonly string[]>();
  const sectorIds = new Set<string>();
  for (const sector of taxonomy.sectors) {
    if (sectorIds.has(sector.id)) problems.push(`Sector "${sector.id}" appears twice.`);
    sectorIds.add(sector.id);
    sectorCategories.set(
      sector.id,
      sector.categories.map((c) => c.id),
    );
    for (const category of sector.categories) {
      const existing = categorySector.get(category.id);
      if (existing) {
        problems.push(
          `Category "${category.id}" is in both "${existing}" and "${sector.id}". Category ids must be unique.`,
        );
      }
      categorySector.set(category.id, sector.id);
    }
  }
  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, index: { taxonomy, categorySector, sectorCategories } };
}
